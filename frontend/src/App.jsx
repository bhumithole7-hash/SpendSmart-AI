
import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./App.css";

const API_URL = "http://127.0.0.1:5000";
const CHART_COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];
function ExpenseChart({ categories }) {
  const chartData = categories.map(([name, value]) => ({
    name,
    value,
  }));

  if (chartData.length === 0) {
    return (
      <section className="panel">
        <h2>Category-wise Spending</h2>
        <p className="muted">
          Add expenses to see your spending chart.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Category-wise Spending</h2>
      <p className="muted">
        See how your expenses are divided across categories.
      </p>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  const [budget, setBudget] = useState(() => {
    return Number(localStorage.getItem("monthlyBudget")) || 20000;
  });

  const [budgetInput, setBudgetInput] = useState(String(budget));
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [activePage, setActivePage] = useState("Dashboard");
  const [loading, setLoading] = useState(true);

  // Check backend and load expenses
  useEffect(() => {
    async function loadData() {
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`);

        if (!healthResponse.ok) {
          throw new Error("Backend health check failed");
        }

        const healthData = await healthResponse.json();
        setBackendStatus(healthData.message);

        const response = await fetch(`${API_URL}/api/expenses`);

        if (!response.ok) {
          throw new Error("Could not load expenses");
        }

        const data = await response.json();
        setExpenses(data);
      } catch (error) {
        setBackendStatus("Backend connection failed");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem("monthlyBudget", String(budget));
    setBudgetInput(String(budget));
  }, [budget]);

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const categoryTotals = expenses.reduce((totals, expense) => {
    const name = expense.category;
    totals[name] = (totals[name] || 0) + Number(expense.amount);
    return totals;
  }, {});

  const categories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const remaining = budget - total;
  const percentage =
    budget > 0 ? Math.min((total / budget) * 100, 100) : 0;

  const highestCategory = categories.length > 0 ? categories[0] : null;

  function money(value) {
    return Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  }

  async function addExpense(e) {
    e.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      alert("Please enter a valid expense.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not add expense");
      }

      setExpenses((previous) => [data, ...previous]);
      setTitle("");
      setAmount("");
      setBackendStatus("SpendSmart AI API is running");
    } catch (error) {
      alert(error.message || "Could not connect to backend.");
    }
  }

  async function deleteExpense(id) {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete expense");
      }

      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== id)
      );
    } catch (error) {
      alert(error.message || "Could not delete expense.");
    }
  }

  function updateBudget(e) {
    e.preventDefault();

    const newBudget = Number(budgetInput);

    if (
      !budgetInput.trim() ||
      !Number.isFinite(newBudget) ||
      newBudget <= 0
    ) {
      alert("Please enter a valid budget greater than zero.");
      return;
    }

    setBudget(newBudget);
    alert("Monthly budget updated!");
  }

  function ExpenseList() {
    if (loading) {
      return <p className="muted">Loading expenses...</p>;
    }

    if (expenses.length === 0) {
      return (
        <div className="empty-state">
          <span>◷</span>
          <p>No expenses yet</p>
          <small>Add your first expense to get started.</small>
        </div>
      );
    }

    return (
      <div className="expense-list">
        {expenses.map((expense) => (
          <div className="expense-row" key={expense.id}>
            <div className="expense-icon">₹</div>

            <div className="expense-info">
              <strong>{expense.title}</strong>
              <small>{expense.category}</small>
            </div>

            <strong className="expense-amount">
              ₹{money(expense.amount)}
            </strong>

            <button
              className="delete-button"
              type="button"
              onClick={() => deleteExpense(expense.id)}
              aria-label={`Delete ${expense.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  function BudgetTracker() {
    return (
      <section className="panel budget-panel">
        <h2>Monthly Budget Tracker</h2>
        <p className="muted">
          Set your budget and keep track of your spending.
        </p>

        <form className="budget-form" onSubmit={updateBudget}>
          <label htmlFor="monthly-budget">Monthly budget (₹)</label>

          <div className="budget-input-row">
            <input
              id="monthly-budget"
              type="number"
              min="1"
              step="any"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="Enter your budget"
              required
            />

            <button type="submit">Save Budget</button>
          </div>
        </form>

        <div className="budget-details">
          <div>
            <span className="muted">Spent</span>
            <h3>₹{money(total)}</h3>
          </div>

          <div>
            <span className="muted">Remaining</span>
            <h3 style={{ color: remaining < 0 ? "#e05252" : "#169b72" }}>
              ₹{money(remaining)}
            </h3>
          </div>
        </div>

        <div
          className="budget-progress"
          role="progressbar"
          aria-label="Monthly budget used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
        >
          <div
            className="budget-progress-fill"
            style={{
              width: `${percentage}%`,
              background: total > budget ? "#e05252" : "#169b72",
            }}
          />
        </div>

        <p className="muted budget-message">
          {total > budget
            ? `You have exceeded your budget by ₹${money(total - budget)}.`
            : `${percentage.toFixed(1)}% of your budget used.`}
        </p>
      </section>
    );
  }

  function CategorySummary() {
    if (categories.length === 0) {
      return <p className="muted">Add expenses to see category summaries.</p>;
    }

    return (
      <div>
        {categories.map(([name, value]) => {
          const share = total > 0 ? (value / total) * 100 : 0;

          return (
            <div key={name} style={{ marginBottom: "18px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "6px",
                }}
              >
                <strong>{name}</strong>
                <span>₹{money(value)} ({share.toFixed(1)}%)</span>
              </div>

              <div className="budget-progress">
                <div
                  className="budget-progress-fill"
                  style={{
                    width: `${share}%`,
                    background: "#169b72",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function AIInsights() {
    const foodTotal = categoryTotals.Food || 0;
    const travelTotal = categoryTotals.Travel || 0;
    

    return (
      <>
        <section className="summary-grid">
          <div className="summary-card">
            <p>Total Spending</p>
            <h2>₹{money(total)}</h2>
            <span>Across all recorded expenses</span>
          </div>

          <div className="summary-card">
            <p>Highest Spending Category</p>
            <h2>{highestCategory ? highestCategory[0] : "None"}</h2>
            <span>
              {highestCategory
                ? `₹${money(highestCategory[1])} spent`
                : "Add expenses to get insights"}
            </span>
          </div>

          <div className="summary-card">
            <p>Budget Used</p>
            <h2>{percentage.toFixed(1)}%</h2>
            <span>Of your monthly budget</span>
          </div>
        </section>

        <section className="panel" style={{ marginTop: "24px" }}>
          <h2>✦ Spending Analysis</h2>

          {expenses.length === 0 ? (
            <p className="muted">
              Add some expenses to receive personalized spending insights.
            </p>
          ) : (
            <>
              <p>
                You have recorded <strong>{expenses.length}</strong>{" "}
                transaction(s), totalling{" "}
                <strong>₹{money(total)}</strong>.
              </p>

              {highestCategory && (
                <p>
                  Your highest spending category is{" "}
                  <strong>{highestCategory[0]}</strong>, with ₹
                  {money(highestCategory[1])} spent.
                </p>
              )}

              <p>
                {total > budget
                  ? `Your spending is ₹${money(total - budget)} over your budget. Review optional expenses before making new purchases.`
                  : `You have ₹${money(remaining)} remaining in your monthly budget.`}
              </p>
            </>
          )}
        </section>

        <section className="panel" style={{ marginTop: "24px" }}>
          <h2>✦ Smart Saving Tips</h2>

          {expenses.length === 0 ? (
            <p className="muted">
              Your tips will appear when you record expenses.
            </p>
          ) : (
            <>
              {foodTotal > 0 && (
                <p>
                  <strong>Food:</strong> Plan meals and compare home-cooked
                  options to find opportunities to save.
                </p>
              )}

              {travelTotal > 0 && (
                <p>
                  <strong>Travel:</strong> Compare travel options and group
                  errands where practical.
                </p>
              )}

              {highestCategory && (
                <p>
                  <strong>Review your largest category:</strong> Check your{" "}
                  {highestCategory[0].toLowerCase()} expenses for purchases
                  you could reduce next month.
                </p>
              )}

              {total > budget * 0.8 && total <= budget && (
                <p>
                  You have used more than 80% of your budget. Review upcoming
                  expenses before spending more.
                </p>
              )}

              {total > budget && (
                <p>
                  Your budget has been exceeded. Consider postponing
                  non-essential purchases and reviewing your budget.
                </p>
              )}

              {categories.length === 1 && (
                <p>
                  Add expenses from other categories to get a broader view
                  of your spending habits.
                </p>
              )}
            </>
          )}

          <p className="muted">
            These insights are generated from your recorded expense data
            using simple rules. They are not predictions from a trained AI model.
          </p>
        </section>

        <section className="panel" style={{ marginTop: "24px" }}>
          <h2>Category-wise Expense Summary</h2>
          <CategorySummary />
        </section>
      </>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>◈ SpendSmart</h2>
        <p className="side-label">MENU</p>

        {["Dashboard", "Transactions", "Budgets", "AI Insights"].map(
          (page) => (
            <div
              key={page}
              className={`nav-item ${activePage === page ? "active" : ""}`}
              onClick={() => setActivePage(page)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActivePage(page);
                }
              }}
            >
              {page === "Dashboard" && "▦ "}
              {page === "Transactions" && "↗ "}
              {page === "Budgets" && "◎ "}
              {page === "AI Insights" && "✦ "}
              {page}
            </div>
          )
        )}

        <div className="sidebar-note">
          <span>✦ Smart tip</span>
          <p>Small spending choices can make a big difference.</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR MONEY, IN CONTROL</p>
            <h1>{activePage}</h1>
            <p className="muted">
              {activePage === "Dashboard" &&
                "Welcome back! Let's track your money."}
              {activePage === "Transactions" &&
                "Review and manage your recorded expenses."}
              {activePage === "Budgets" &&
                "Plan your spending and track your budget."}
              {activePage === "AI Insights" &&
                "Understand your spending and discover saving opportunities."}
            </p>

            <p className="muted">
              Backend status:{" "}
              <strong
                style={{
                  color: backendStatus.includes("running")
                    ? "#169b72"
                    : backendStatus.includes("failed")
                    ? "#e05252"
                    : "inherit",
                }}
              >
                {backendStatus}
              </strong>
            </p>
          </div>

          <div className="avatar">B</div>
        </header>

        {activePage === "Dashboard" && (
          <>
            <section className="summary-grid">
              <div className="summary-card">
                <p>Total Expenses</p>
                <h2>₹{money(total)}</h2>
                <span>Total recorded</span>
              </div>

              <div className="summary-card">
                <p>Transactions</p>
                <h2>{expenses.length}</h2>
                <span>Expenses recorded</span>
              </div>

              <div className="summary-card">
                <p>Monthly Budget</p>
                <h2>₹{money(budget)}</h2>
                <span>Your spending limit</span>
              </div>
            </section>

            <BudgetTracker />

            <section className="content-grid">
              <div className="panel">
                <h2>Add an expense</h2>
                <p className="muted">Record where your money goes.</p>

                <form onSubmit={addExpense}>
                  <label htmlFor="expense-title">Expense name</label>
                  <input
                    id="expense-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lunch"
                    required
                  />

                  <label htmlFor="expense-amount">Amount (₹)</label>
                  <input
                    id="expense-amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 250"
                    required
                  />

                  <label htmlFor="expense-category">Category</label>
                  <select
                    id="expense-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Food</option>
                    <option>Travel</option>
                    <option>Shopping</option>
                    <option>Education</option>
                    <option>Bills</option>
                    <option>Other</option>
                  </select>

                  <button type="submit">+ Add Expense</button>
                </form>
              </div>

              <div className="panel">
                <h2>Recent transactions</h2>
                <p className="muted">Your recorded expenses.</p>
                <ExpenseList />
              </div>
            </section>
          </>
        )}

        {activePage === "Transactions" && (
          <section className="panel">
            <h2>All Transactions</h2>
            <p className="muted">
              Your expenses are saved in the backend database.
            </p>
            <ExpenseList />
          </section>
        )}

        {activePage === "Budgets" && <BudgetTracker />}

      {activePage === "AI Insights" && (
  <>
    <AIInsights />
    <ExpenseChart categories={categories} />
  </>
)}

        <footer>SpendSmart AI · Build better money habits</footer>
      </main>
    </div>
  );
}

export default App;
