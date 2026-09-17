import { useEffect, useState } from "react";
import "./App.css";

const XP_VALUES = { Easy: 10, Medium: 20, Hard: 30 };
const DAILY_GOAL = 3;
const REFILL_COST = 100;

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const previousDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
};

const currentStreakFor = (dates) => {
  const completed = new Set(dates);
  let key = getDateKey();
  let streak = 0;
  while (completed.has(key)) {
    streak += 1;
    key = previousDate(key);
  }
  return streak;
};

const bestStreakFor = (dates) => {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return 0;
  let best = 1;
  let current = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    current = previousDate(sorted[index]) === sorted[index - 1] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
};

const INITIAL_TASKS = [
  { id: 1, title: "Complete DSA practice", category: "Coding", difficulty: "Medium", xp: 20, completed: false, date: getDateKey() },
  { id: 2, title: "Revise college notes", category: "College", difficulty: "Easy", xp: 10, completed: false, date: getDateKey() },
  { id: 3, title: "Work on StreakUp", category: "Projects", difficulty: "Hard", xp: 30, completed: false, date: getDateKey() },
];

function App() {
  const today = new Date();
  const todayKey = getDateKey(today);
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("streakup_tasks"));
      return Array.isArray(saved)
        ? saved.map((task) => ({ ...task, xp: task.xp ?? XP_VALUES[task.difficulty] ?? 10, completed: Boolean(task.completed), date: task.date || todayKey }))
        : INITIAL_TASKS;
    } catch { return INITIAL_TASKS; }
  });
  const [completedDates, setCompletedDates] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("streakup_completed_dates"));
      return Array.isArray(saved) ? [...new Set(saved)] : [];
    } catch { return []; }
  });
  const [xpSpent, setXpSpent] = useState(() => Number(localStorage.getItem("streakup_xp_spent")) || 0);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", category: "Coding", difficulty: "Easy" });
  const [taskDateOption, setTaskDateOption] = useState("today");
  const [customTaskDate, setCustomTaskDate] = useState("");
  const [refillDays, setRefillDays] = useState(1);
  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => localStorage.setItem("streakup_tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("streakup_completed_dates", JSON.stringify(completedDates)), [completedDates]);
  useEffect(() => localStorage.setItem("streakup_xp_spent", String(xpSpent)), [xpSpent]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("main.main > section"));
    const visibleSections = { dashboard: [0, 1, 2, 3, 5], history: [4], achievements: [6] };
    sections.forEach((section, index) => { section.hidden = !visibleSections[activePage]?.includes(index); });
    document.querySelectorAll("nav a").forEach((link) => link.classList.toggle("active", link.textContent.trim().toLowerCase() === activePage));
  }, [activePage]);

  useEffect(() => {
    const nav = document.querySelector("nav");
    const handleNavigation = (event) => {
      const link = event.target.closest("a");
      const page = link?.textContent.trim().toLowerCase();
      if (!["dashboard", "history", "achievements"].includes(page)) return;
      event.preventDefault();
      setActivePage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    nav?.addEventListener("click", handleNavigation);
    return () => nav?.removeEventListener("click", handleNavigation);
  }, []);

  const todaysTasks = tasks.filter((task) => task.date === todayKey);
  const completedTasks = todaysTasks.filter((task) => task.completed).length;
  const dailyGoalCompleted = completedTasks >= DAILY_GOAL;

  useEffect(() => {
    setCompletedDates((dates) => {
      const hasToday = dates.includes(todayKey);
      if (dailyGoalCompleted && !hasToday) return [...dates, todayKey].sort();
      if (!dailyGoalCompleted && hasToday) return dates.filter((date) => date !== todayKey);
      return dates;
    });
  }, [dailyGoalCompleted, todayKey]);

  const totalEarnedXP = tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0);
  const availableXP = Math.max(totalEarnedXP - xpSpent, 0);
  const currentStreak = currentStreakFor(completedDates);
  const bestStreak = bestStreakFor(completedDates);
  const progressPercentage = Math.min((completedTasks / DAILY_GOAL) * 100, 100);

  const selectedTaskDate = () => {
    if (taskDateOption === "today") return todayKey;
    if (taskDateOption === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return getDateKey(tomorrow);
    }
    return customTaskDate || todayKey;
  };

  const resetForm = () => {
    setNewTask({ title: "", category: "Coding", difficulty: "Easy" });
    setTaskDateOption("today");
    setCustomTaskDate("");
    setShowForm(false);
  };

  const addTask = (event) => {
    event.preventDefault();
    const title = newTask.title.trim();
    if (!title) return;
    setTasks((current) => [...current, { id: Date.now(), title, category: newTask.category, difficulty: newTask.difficulty, xp: XP_VALUES[newTask.difficulty], completed: false, date: selectedTaskDate() }]);
    resetForm();
  };

  const refillCandidates = [];
  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  checkDate.setDate(checkDate.getDate() - 1);
  while (refillCandidates.length < 30) {
    const key = getDateKey(checkDate);
    if (completedDates.includes(key)) break;
    refillCandidates.push(key);
    checkDate.setDate(checkDate.getDate() - 1);
  }
  const maxRefillDays = Math.min(refillCandidates.length, Math.floor(availableXP / REFILL_COST));
  const refillCost = refillDays * REFILL_COST;
  const refillStreak = () => {
    if (refillDays < 1 || refillDays > maxRefillDays) return;
    setCompletedDates((dates) => [...new Set([...dates, ...refillCandidates.slice(0, refillDays)])].sort());
    setXpSpent((spent) => spent + refillCost);
    setRefillDays(1);
  };

  const activityMonths = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const isCurrent = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
    const lastDay = isCurrent ? today.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      name: month.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      days: Array.from({ length: lastDay }, (_, day) => {
        const key = getDateKey(new Date(month.getFullYear(), month.getMonth(), day + 1));
        return { key, active: completedDates.includes(key) };
      }),
    };
  });

  const weeklyHistory = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const key = getDateKey(date);
    const dayTasks = tasks.filter((task) => task.date === key);
    const completed = dayTasks.filter((task) => task.completed).length;
    const total = dayTasks.length;
    return {
      key, completed, total,
      xp: dayTasks.filter((task) => task.completed).reduce((sum, task) => sum + task.xp, 0),
      percent: total ? Math.round((completed / total) * 100) : 0,
      goalReached: completed >= DAILY_GOAL || completedDates.includes(key),
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
  const weeklyCompleted = weeklyHistory.reduce((sum, day) => sum + day.completed, 0);
  const weeklyTotal = weeklyHistory.reduce((sum, day) => sum + day.total, 0);
  const weeklyXP = weeklyHistory.reduce((sum, day) => sum + day.xp, 0);
  const weeklyPercent = weeklyTotal ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
  const weeklyGoalDays = weeklyHistory.filter((day) => day.goalReached).length;
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";

  return <div className="app">
    <header className="header"><div className="logo"><span className="logo-icon">🔥</span><span>StreakUp</span></div><nav><a className="active" href="#dashboard">Dashboard</a><a href="#history">History</a><a href="#achievements">Achievements</a></nav><div className="header-right"><button className="theme-btn" type="button">☾</button><div className="profile"><div className="avatar">M</div><span>Mammu</span></div></div></header>
    <main className="main" id="dashboard">
      <section className="welcome"><p className="date">{today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><h1>{greeting}! 👋</h1><p className="subtitle">Stay consistent. Keep your streak alive!</p></section>
      <section className="stats-grid">
        <div className="stat-card"><div className="stat-icon fire">🔥</div><div><p>Current Streak</p><h2>{currentStreak} <span>days</span></h2></div></div>
        <div className="stat-card"><div className="stat-icon trophy">🏆</div><div><p>Best Streak</p><h2>{bestStreak} <span>days</span></h2></div></div>
        <div className="stat-card"><div className="stat-icon target">🎯</div><div><p>Today's Progress</p><h2>{completedTasks} <span>/{todaysTasks.length}</span></h2></div></div>
        <div className="stat-card"><div className="stat-icon xp">⚡</div><div><p>Available XP</p><h2>{availableXP}</h2></div></div>
      </section>
      <section className="tasks-section"><div className="section-heading"><div><h2>Today's Tasks</h2><p>Complete at least 3 tasks to maintain your streak.</p></div><button className="add-btn" type="button" onClick={() => setShowForm(true)}>+ Add Task</button></div>
        {showForm && <div className="add-task-form"><h3>Add a new task</h3><form onSubmit={addTask}>
          <div className="form-group"><label>Task name</label><input value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} placeholder="Example: Practice arrays" autoFocus /></div>
          <div className="form-group"><label>Category</label><select value={newTask.category} onChange={(event) => setNewTask({ ...newTask, category: event.target.value })}><option>Coding</option><option>College</option><option>Personal</option><option>Projects</option></select></div>
          <div className="form-group"><label>Difficulty</label><select value={newTask.difficulty} onChange={(event) => setNewTask({ ...newTask, difficulty: event.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
          <div className="form-group"><label>When do you want to do it?</label><select value={taskDateOption} onChange={(event) => setTaskDateOption(event.target.value)}><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="custom">Choose a date</option></select></div>
          {taskDateOption === "custom" && <div className="form-group"><label>Choose date</label><input type="date" min={todayKey} value={customTaskDate} onChange={(event) => setCustomTaskDate(event.target.value)} /></div>}
          <div className="form-buttons"><button className="cancel-btn" type="button" onClick={resetForm}>Cancel</button><button className="save-task-btn" type="submit">Add Task</button></div>
        </form></div>}
        <div className="task-list">{todaysTasks.length ? todaysTasks.map((task) => <div className={`task-card ${task.completed ? "completed" : ""}`} key={task.id}><button className="check-btn" type="button" onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))}>{task.completed ? "✓" : ""}</button><div className="task-info"><h3>{task.title}</h3><div className="task-meta"><span className="category">{task.category}</span><span>{task.difficulty}</span></div></div><div className="task-xp">+{task.xp} XP</div><button className="delete-btn" type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>🗑</button></div>) : <div className="empty-tasks"><div className="empty-icon">✨</div><h3>No tasks for today</h3><button className="add-btn" type="button" onClick={() => setShowForm(true)}>+ Add your first task</button></div>}</div>
        <div className="daily-progress"><div className="progress-header"><span>Daily Goal</span><strong>{completedTasks}/{DAILY_GOAL} tasks</strong></div><div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercentage}%` }} /></div>{dailyGoalCompleted && <p className="goal-complete">🎉 Daily goal completed! Your streak is protected.</p>}</div>
      </section>
      <section className="activity-section"><div className="section-heading"><div><h2>Activity</h2><p>Your productivity over the latest six months</p></div></div><div className="activity-card"><div className="activity-top"><strong>Productivity</strong><span>Less ← Activity → More</span></div><div style={{ display: "flex", gap: "28px", overflowX: "auto", paddingBottom: "8px" }}>{activityMonths.map((month) => <div key={month.key} style={{ flex: "0 0 auto", minWidth: "130px" }}><p style={{ margin: "0 0 10px", fontWeight: 600 }}>{month.name}</p><div className="calendar" style={{ display: "grid", gridTemplateColumns: "repeat(7, 16px)", gap: "6px" }}>{month.days.map((day) => <div key={day.key} className={`calendar-cell ${day.active ? "active" : ""}`} title={day.key} />)}</div></div>)}</div></div></section>
      <section className="activity-section" id="history">
        <div className="section-heading">
          <div>
            <h2>Weekly History</h2>
            <p>Real task completion for the last 7 days.</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon target">✅</div>
            <div>
              <p>Tasks Completed</p>
              <h2>{weeklyCompleted} <span>/{weeklyTotal}</span></h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon xp">⚡</div>
            <div>
              <p>Weekly XP</p>
              <h2>{weeklyXP}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon fire">🔥</div>
            <div>
              <p>Goal Days</p>
              <h2>{weeklyGoalDays} <span>/7</span></h2>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
            gap: "22px",
            marginTop: "24px",
          }}
        >
          <div className="activity-card">
            <div className="activity-top">
              <div>
                <strong>Daily completion</strong>
                <p style={{ margin: "5px 0 0", color: "#a9a1bb", fontSize: "13px" }}>
                  Percentage of tasks completed each day
                </p>
              </div>
              <span>Last 7 days</span>
            </div>

            <div
              style={{
                height: "250px",
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                gap: "14px",
                padding: "32px 14px 14px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                marginTop: "18px",
              }}
            >
              {weeklyHistory.map((day) => (
                <div
                  key={day.key}
                  style={{
                    flex: 1,
                    minWidth: "34px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "end",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "13px",
                      color: day.percent > 0 ? "#f5f2ff" : "#8b849c",
                    }}
                  >
                    {day.total > 0 ? `${day.percent}%` : "—"}
                  </strong>

                  <div
                    title={`${day.date}: ${day.completed} of ${day.total} tasks completed`}
                    style={{
                      width: "100%",
                      maxWidth: "46px",
                      minHeight: day.total > 0 ? "8px" : "3px",
                      height: `${day.total > 0
                          ? Math.max((day.percent / 100) * 150, 8)
                          : 3
                        }px`,
                      borderRadius: "10px 10px 4px 4px",
                      background:
                        day.percent > 0
                          ? "linear-gradient(180deg, #a78bfa 0%, #6d5dfc 100%)"
                          : "rgba(255,255,255,0.12)",
                      boxShadow:
                        day.percent > 0
                          ? "0 8px 18px rgba(109,93,252,0.28)"
                          : "none",
                    }}
                  />

                  <div style={{ textAlign: "center" }}>
                    <strong style={{ display: "block", fontSize: "13px" }}>
                      {day.label}
                    </strong>
                    <small style={{ color: "#938ca5", fontSize: "11px" }}>
                      {day.completed}/{day.total}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="activity-top">
              <div>
                <strong>Weekly completion</strong>
                <p style={{ margin: "5px 0 0", color: "#a9a1bb", fontSize: "13px" }}>
                  Completed tasks this week
                </p>
              </div>
            </div>

            <div
              style={{
                minHeight: "250px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
              }}
            >
              <div
                style={{
                  width: "168px",
                  height: "168px",
                  borderRadius: "50%",
                  background: weeklyTotal
                    ? `conic-gradient(#8b7bff 0 ${weeklyPercent}%, #302a40 ${weeklyPercent}% 100%)`
                    : "#302a40",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
                }}
              >
                <div
                  style={{
                    width: "124px",
                    height: "124px",
                    borderRadius: "50%",
                    background: "#171321",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <strong style={{ color: "#f8f6ff", fontSize: "30px" }}>
                    {weeklyPercent}%
                  </strong>
                  <small style={{ color: "#aaa2ba", marginTop: "4px" }}>
                    completion
                  </small>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "18px",
                  color: "#c7c0d5",
                  fontSize: "13px",
                }}
              >
                <span>
                  <span style={{ color: "#8b7bff" }}>●</span> Done:{" "}
                  {weeklyCompleted}
                </span>
                <span>
                  <span style={{ color: "#756d86" }}>●</span> Left:{" "}
                  {Math.max(weeklyTotal - weeklyCompleted, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="activity-card" style={{ marginTop: "22px" }}>
          <div className="activity-top">
            <strong>Daily breakdown</strong>
            <span>Streak goal: at least 3 tasks</span>
          </div>

          <div style={{ overflowX: "auto", marginTop: "14px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ color: "#a9a1bb", fontSize: "13px" }}>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Tasks</th>
                  <th style={{ padding: "12px" }}>Completion</th>
                  <th style={{ padding: "12px" }}>XP</th>
                  <th style={{ padding: "12px" }}>Goal</th>
                </tr>
              </thead>

              <tbody>
                {[...weeklyHistory].reverse().map((day) => (
                  <tr
                    key={day.key}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <td style={{ padding: "14px 12px", fontWeight: 600 }}>
                      {day.date}
                      {day.key === todayKey ? " · Today" : ""}
                    </td>
                    <td style={{ padding: "14px 12px" }}>
                      {day.completed}/{day.total}
                    </td>
                    <td style={{ padding: "14px 12px" }}>{day.percent}%</td>
                    <td style={{ padding: "14px 12px" }}>+{day.xp} XP</td>
                    <td style={{ padding: "14px 12px" }}>
                      {day.goalReached ? "✅ Completed" : "○ Not completed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="activity-section" id="refill"><div className="section-heading"><div><h2>Streak Refill</h2><p>Restore missed days using {REFILL_COST} XP per day.</p></div></div><div className="activity-card">{!refillCandidates.length ? <div className="empty-tasks"><div className="empty-icon">✨</div><h3>No missed streak days to refill</h3></div> : <><div className="stats-grid"><div className="stat-card"><div className="stat-icon fire">🔥</div><div><p>Missed Days</p><h2>{refillCandidates.length}</h2></div></div><div className="stat-card"><div className="stat-icon xp">⚡</div><div><p>Available XP</p><h2>{availableXP}</h2></div></div><div className="stat-card"><div className="stat-icon target">💎</div><div><p>Refill Cost</p><h2>{REFILL_COST}<span> XP/day</span></h2></div></div></div>{maxRefillDays ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}><strong>Days to refill:</strong><select value={refillDays} onChange={(event) => setRefillDays(Number(event.target.value))}>{Array.from({ length: maxRefillDays }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} day{index ? "s" : ""}</option>)}</select><strong>Cost: {refillCost} XP</strong><button className="add-btn" type="button" onClick={refillStreak}>🔥 Refill Streak</button></div> : <p className="goal-complete">You need at least {REFILL_COST} XP to refill one missed day.</p>}</>}</div></section>
      <section className="achievements-section" id="achievements"><div className="section-heading"><div><h2>Achievements</h2><p>Keep going and unlock new milestones.</p></div></div><div className="achievement-grid">{[[3, "🔥"], [7, "⚡"], [30, "🏆"]].map(([days, icon]) => <div className="achievement-card" key={days}><div className="achievement-icon">{icon}</div><div><h3>{days} Day Streak</h3><p>Maintain a {days} day streak</p><div className="achievement-progress"><div style={{ width: `${Math.min((bestStreak / days) * 100, 100)}%` }} /></div><small>{Math.min(bestStreak, days)} / {days}</small></div></div>)}</div></section>
    </main>
  </div>;
}

export default App;


