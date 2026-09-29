import { useEffect, useRef, useState } from "react";
import Auth from "./Auth";
import { supabase } from "./supabaseClient";
import "./App.css";

const XP_VALUES = {
  Easy: 10,
  Medium: 20,
  Hard: 30,
};

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
    current =
      previousDate(sorted[index]) === sorted[index - 1]
        ? current + 1
        : 1;

    best = Math.max(best, current);
  }

  return best;
};

const INITIAL_TASKS = [
  {
    id: 1,
    title: "Complete DSA practice",
    category: "Coding",
    difficulty: "Medium",
    xp: 20,
    completed: false,
    date: getDateKey(),
  },
  {
    id: 2,
    title: "Revise college notes",
    category: "College",
    difficulty: "Easy",
    xp: 10,
    completed: false,
    date: getDateKey(),
  },
  {
    id: 3,
    title: "Work on StreakUp",
    category: "Projects",
    difficulty: "Hard",
    xp: 30,
    completed: false,
    date: getDateKey(),
  },
];

function App() {

  const today = new Date();
  const todayKey = getDateKey(today);

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("streakup_tasks"));

      return Array.isArray(saved)
        ? saved.map((task) => ({
          ...task,
          xp:
            task.xp ??
            XP_VALUES[task.difficulty] ??
            10,
          completed: Boolean(task.completed),
          date: task.date || todayKey,
        }))
        : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [completedDates, setCompletedDates] = useState([]);
  const [refilledDates, setRefilledDates] = useState([]);
  const [xpSpent, setXpSpent] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "Coding",
    difficulty: "Easy",
  });

  const [taskDateOption, setTaskDateOption] =
    useState("today");

  const [customTaskDate, setCustomTaskDate] =
    useState("");

  const [refillDays, setRefillDays] = useState(1);

  const [activePage, setActivePage] =
    useState("dashboard");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const activityScrollRef = useRef(null);

  useEffect(() => {
    if (activePage !== "dashboard") return;

    const timer = setTimeout(() => {
      const activity = activityScrollRef.current;

      if (!activity) return;

      activity.scrollLeft = activity.scrollWidth;
    }, 300);

    return () => clearTimeout(timer);
  }, [activePage]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".profile")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const profileName =
    session?.user?.user_metadata?.full_name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "User";

  const profileInitials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0].toUpperCase())
    .join("");
  console.log("AUTH STATE:", {
    session,
    authLoading,
  });
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setAuthLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const loadTasks = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading tasks:", error);
        return;
      }

      const formattedTasks = data.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        difficulty: task.difficulty,
        xp: task.xp,
        completed: task.completed,
        date: task.task_date,
      }));

      setTasks(formattedTasks);
    };

    loadTasks();
  }, [session]);
  useEffect(() => {
    const loadCompletedDays = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("completed_days")
        .select("completed_date")
        .eq("user_id", session.user.id)
        .order("completed_date", { ascending: true });

      if (error) {
        console.error("Error loading completed days:", error);
        return;
      }

      const dates = data.map((item) => item.completed_date);

      setCompletedDates(dates);
    };

    loadCompletedDays();
  }, [session]);

  useEffect(() => {
    const loadRefilledDays = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("refilled_days")
        .select("refilled_date")
        .eq("user_id", session.user.id)
        .order("refilled_date", { ascending: true });

      if (error) {
        console.error("Error loading refilled days:", error);
        return;
      }

      const dates = data.map((item) => item.refilled_date);

      setRefilledDates(dates);
    };

    loadRefilledDays();
  }, [session]);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("streakup_theme") !== "light";
  });
  useEffect(() => {
    localStorage.setItem(
      "streakup_tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);
  useEffect(() => {
    document.body.classList.toggle("light-mode", !darkMode);
    localStorage.setItem(
      "streakup_theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);


  useEffect(() => {
    localStorage.setItem(
      "streakup_xp_spent",
      String(xpSpent)
    );
  }, [xpSpent]);




  /* =========================
     TODAY'S TASKS
  ========================= */

  const todaysTasks = tasks.filter(
    (task) => task.date === todayKey
  );

  const completedTasks = todaysTasks.filter(
    (task) => task.completed
  ).length;

  const totalTasks = todaysTasks.length;

  const dailyGoalCompleted =
    completedTasks >= DAILY_GOAL;

  /*
    Daily progress is based on:
    completed tasks / total tasks

    Example:
    3 completed out of 7 = 42.86%
  */
  const progressPercentage =
    todaysTasks.length > 0
      ? Math.min((completedTasks / todaysTasks.length) * 100, 100)
      : 0;

  useEffect(() => {
    const syncTodayCompletedDay = async () => {
      if (!session?.user?.id) return;

      const hasToday = completedDates.includes(todayKey);

      if (dailyGoalCompleted && !hasToday) {
        const { error } = await supabase
          .from("completed_days")
          .insert({
            user_id: session.user.id,
            completed_date: todayKey,
          });

        if (error) {
          console.error("Error saving completed day:", error);
          return;
        }

        setCompletedDates((current) => [...current, todayKey]);
      }

      if (!dailyGoalCompleted && hasToday) {
        const { error } = await supabase
          .from("completed_days")
          .delete()
          .eq("user_id", session.user.id)
          .eq("completed_date", todayKey);

        if (error) {
          console.error("Error removing completed day:", error);
          return;
        }

        setCompletedDates((current) =>
          current.filter((date) => date !== todayKey)
        );
      }
    };

    syncTodayCompletedDay();
  }, [
    dailyGoalCompleted,
    todayKey,
    session,
    completedDates,
  ]);
  /* =========================
     XP & STREAK
  ========================= */

  const totalEarnedXP = tasks
    .filter((task) => task.completed)
    .reduce(
      (sum, task) => sum + task.xp,
      0
    );

  const availableXP = Math.max(
    totalEarnedXP - xpSpent,
    0
  );

  const currentStreak =
    currentStreakFor(completedDates);

  const bestStreak =
    bestStreakFor(completedDates);

  /* =========================
     TASK DATE
  ========================= */

  const selectedTaskDate = () => {
    if (taskDateOption === "today") {
      return todayKey;
    }

    if (taskDateOption === "tomorrow") {
      const tomorrow = new Date();

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      return getDateKey(tomorrow);
    }

    return customTaskDate || todayKey;
  };

  const resetForm = () => {
    setNewTask({
      title: "",
      category: "Coding",
      difficulty: "Easy",
    });

    setTaskDateOption("today");
    setCustomTaskDate("");
    setShowForm(false);
  };

  const addTask = async (event) => {
    event.preventDefault();

    const title = newTask.title.trim();

    if (!title) return;

    if (!session?.user?.id) {
      alert("Please sign in again.");
      return;
    }

    const taskDate = selectedTaskDate();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: session.user.id,
        title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        xp: XP_VALUES[newTask.difficulty],
        completed: false,
        task_date: taskDate,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error);
      alert("Could not save the task. Please try again.");
      return;
    }

    setTasks((current) => [
      ...current,
      {
        id: data.id,
        title: data.title,
        category: data.category,
        difficulty: data.difficulty,
        xp: data.xp,
        completed: data.completed,
        date: data.task_date,
      },
    ]);

    resetForm();
  };

  /* =========================
     STREAK REFILL
  ========================= */

  const refillCandidates = [];

  const checkDate = new Date();

  checkDate.setHours(0, 0, 0, 0);

  checkDate.setDate(
    checkDate.getDate() - 1
  );

  while (refillCandidates.length < 30) {
    const key = getDateKey(checkDate);

    if (completedDates.includes(key)) {
      break;
    }

    refillCandidates.push(key);

    checkDate.setDate(
      checkDate.getDate() - 1
    );
  }

  const maxRefillDays = Math.min(
    refillCandidates.length,
    Math.floor(
      availableXP / REFILL_COST
    )
  );

  const refillCost =
    refillDays * REFILL_COST;
  const refillStreak = async () => {
    if (
      refillDays < 1 ||
      refillDays > maxRefillDays
    ) {
      return;
    }

    if (!session?.user?.id) {
      return;
    }

    const selectedDates = refillCandidates.slice(
      0,
      refillDays
    );

    // Save refilled dates
    const refilledRows = selectedDates.map((date) => ({
      user_id: session.user.id,
      refilled_date: date,
    }));

    const { error: refillError } = await supabase
      .from("refilled_days")
      .insert(refilledRows);

    if (refillError) {
      console.error(
        "Error saving refilled days:",
        refillError
      );
      alert("Could not save refilled days.");
      return;
    }

    // Also add these dates to completed_days
    const completedRows = selectedDates.map((date) => ({
      user_id: session.user.id,
      completed_date: date,
    }));

    const { error: completedError } = await supabase
      .from("completed_days")
      .upsert(completedRows, {
        onConflict: "user_id,completed_date",
      });

    if (completedError) {
      console.error(
        "Error saving completed days:",
        completedError
      );
      alert("Could not save streak days.");
      return;
    }

    // Save XP spending
    const newXpSpent = xpSpent + refillCost;

    const { error: xpError } = await supabase
      .from("user_xp")
      .upsert(
        {
          user_id: session.user.id,
          xp_spent: newXpSpent,
        },
        {
          onConflict: "user_id",
        }
      );

    if (xpError) {
      console.error(
        "Error saving XP spent:",
        xpError
      );
      alert("Could not save XP spending.");
      return;
    }

    // Update the UI immediately
    setCompletedDates((dates) =>
      [
        ...new Set([
          ...dates,
          ...selectedDates,
        ]),
      ].sort()
    );

    setRefilledDates((dates) =>
      [
        ...new Set([
          ...dates,
          ...selectedDates,
        ]),
      ].sort()
    );

    setXpSpent(newXpSpent);

    setRefillDays(1);
  };


  /* =========================
     ACTIVITY CALENDAR
  ========================= */

  /*
    Count ONLY completed tasks for every date.

    Example:

    2026-09-01 → 0
    2026-09-02 → 2
    2026-09-03 → 5
    2026-09-04 → 8
    2026-09-05 → 12
  */

  const activityTaskCounts =
    tasks.reduce((counts, task) => {
      if (task.completed) {
        counts[task.date] =
          (counts[task.date] || 0) + 1;
      }

      return counts;
    }, {});

  const activityMonths = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(
      today.getFullYear(),
      today.getMonth() - 5 + index,

    );

    const isCurrent =
      month.getFullYear() === today.getFullYear() &&
      month.getMonth() === today.getMonth();

    const lastDay = isCurrent
      ? today.getDate()
      : new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0
      ).getDate();

    const firstDay = month.getDay();

    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = Array.from({ length: lastDay }, (_, day) => {
      const date = new Date(
        month.getFullYear(),
        month.getMonth(),
        day + 1
      );

      const key = getDateKey(date);

      const completedCount = tasks.filter(
        (task) => task.date === key && task.completed
      ).length;

      return {
        key,
        completedCount,
        dayName: date.toLocaleDateString("en-US", {
          weekday: "long",
        }),
      };
    });

    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      name: month.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      mondayOffset,
      days,
    };
  });

  /* =========================
     WEEKLY HISTORY
  ========================= */

  const weeklyHistory = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();

      date.setHours(0, 0, 0, 0);

      date.setDate(
        date.getDate() - 6 + index
      );

      const key = getDateKey(date);

      const dayTasks = tasks.filter(
        (task) => task.date === key
      );

      const completed =
        dayTasks.filter(
          (task) => task.completed
        ).length;

      const total = dayTasks.length;

      return {
        key,
        completed,
        total,

        xp: dayTasks
          .filter(
            (task) => task.completed
          )
          .reduce(
            (sum, task) =>
              sum + task.xp,
            0
          ),

        percent: total
          ? Math.round(
            (completed / total) * 100
          )
          : 0,

        goalReached:
          completed >= DAILY_GOAL ||
          completedDates.includes(key),

        date: date.toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
          }
        ),

        label: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),
      };
    }
  );

  const weeklyCompleted =
    weeklyHistory.reduce(
      (sum, day) =>
        sum + day.completed,
      0
    );

  const weeklyTotal =
    weeklyHistory.reduce(
      (sum, day) =>
        sum + day.total,
      0
    );

  const weeklyXP =
    weeklyHistory.reduce(
      (sum, day) =>
        sum + day.xp,
      0
    );

  const weeklyPercent =
    weeklyTotal
      ? Math.round(
        (weeklyCompleted /
          weeklyTotal) *
        100
      )
      : 0;

  const weeklyGoalDays =
    weeklyHistory.filter(
      (day) => day.goalReached
    ).length;

  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  if (authLoading) {
    return (
      <div className="auth-loading">
        Loading StreakUp...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }
  return (
    <div className={`app ${darkMode ? "dark-mode" : "light-mode"}`}>

      {/* =========================
          HEADER
      ========================= */}

      <header className="header">

        <div className="logo">
          <span className="logo-icon">
            🔥
          </span>

          <span>StreakUp</span>
        </div>

        <nav>
          <a
            href="#dashboard"
            className={activePage === "dashboard" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              setActivePage("dashboard");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Dashboard
          </a>

          <a
            href="#history"
            className={activePage === "history" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              setActivePage("history");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            History
          </a>

          <a
            href="#achievements"
            className={activePage === "achievements" ? "active" : ""}
            onClick={(event) => {
              event.preventDefault();
              setActivePage("achievements");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Achievements
          </a>
        </nav>

        <div className="header-right">

          <div className="profile">
            <button
              className="avatar"
              type="button"
              onClick={() => setShowProfileMenu((current) => !current)}
            >
              {profileInitials}
            </button>

            <span>{profileName}</span>

            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-menu-avatar">
                    {profileInitials}
                  </div>

                  <div>
                    <strong>{profileName}</strong>
                    <span>{session?.user?.email}</span>
                  </div>
                </div>

                <div className="profile-menu-divider"></div>

                <button
                  className="profile-menu-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setActivePage("profile");
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                >
                  👤 <span>My Profile</span>
                </button>

                <button
                  className="profile-menu-item logout-item"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setShowProfileMenu(false);
                  }}
                >
                  🚪 <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </header>

      <main
        className={`main ${activePage}-page`}
        id="dashboard"
      >

        {/* =========================
            WELCOME
        ========================= */}

        <section className="welcome">

          <p className="date">
            {today.toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </p>

          <h1>
            {greeting}! 👋
          </h1>

          <p className="subtitle">
            Stay consistent. Keep your
            streak alive!
          </p>

        </section>

        {/* =========================
            STATS
        ========================= */}

        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon fire">
              🔥
            </div>

            <div>
              <p>
                Current Streak
              </p>

              <h2>
                {currentStreak}
                <span>
                  days
                </span>
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon trophy">
              🏆
            </div>

            <div>
              <p>
                Best Streak
              </p>

              <h2>
                {bestStreak}
                <span>
                  days
                </span>
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon target">
              🎯
            </div>

            <div>
              <p>
                Today's Progress
              </p>

              <h2>
                {completedTasks}
                <span>
                  /{totalTasks}
                </span>
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon xp">
              ⚡
            </div>

            <div>
              <p>
                Available XP
              </p>

              <h2>
                {availableXP}
              </h2>
            </div>
          </div>

        </section>

        {/* =========================
            TODAY'S TASKS
        ========================= */}

        <section className="tasks-section">

          <div className="section-heading">

            <div>
              <h2>
                Today's Tasks
              </h2>

              <p>
                Complete at least 3 tasks
                to maintain your streak.
              </p>
            </div>

            <button
              className="add-btn"
              type="button"
              onClick={() =>
                setShowForm(true)
              }
            >
              + Add Task
            </button>

          </div>

          {showForm && (
            <div className="add-task-form">

              <h3>
                Add a new task
              </h3>

              <form
                onSubmit={addTask}
              >

                <div className="form-group">
                  <label>
                    Task name
                  </label>

                  <input
                    value={
                      newTask.title
                    }
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        title:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Example: Practice arrays"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>
                    Category
                  </label>

                  <select
                    value={
                      newTask.category
                    }
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        category:
                          event.target
                            .value,
                      })
                    }
                  >
                    <option>
                      Coding
                    </option>

                    <option>
                      College
                    </option>

                    <option>
                      Personal
                    </option>

                    <option>
                      Projects
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Difficulty
                  </label>

                  <select
                    value={
                      newTask.difficulty
                    }
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        difficulty:
                          event.target
                            .value,
                      })
                    }
                  >
                    <option>
                      Easy
                    </option>

                    <option>
                      Medium
                    </option>

                    <option>
                      Hard
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    When do you want to do it?
                  </label>

                  <select
                    value={
                      taskDateOption
                    }
                    onChange={(event) =>
                      setTaskDateOption(
                        event.target
                          .value
                      )
                    }
                  >
                    <option value="today">
                      Today
                    </option>

                    <option value="tomorrow">
                      Tomorrow
                    </option>

                    <option value="custom">
                      Choose a date
                    </option>
                  </select>
                </div>

                {taskDateOption ===
                  "custom" && (
                    <div className="form-group">
                      <label>
                        Choose date
                      </label>

                      <input
                        type="date"
                        min={todayKey}
                        value={
                          customTaskDate
                        }
                        onChange={(event) =>
                          setCustomTaskDate(
                            event.target
                              .value
                          )
                        }
                      />
                    </div>
                  )}

                <div className="form-buttons">

                  <button
                    className="cancel-btn"
                    type="button"
                    onClick={
                      resetForm
                    }
                  >
                    Cancel
                  </button>

                  <button
                    className="save-task-btn"
                    type="submit"
                  >
                    Add Task
                  </button>

                </div>

              </form>

            </div>
          )}

          <div className="task-list">

            {todaysTasks.length ? (
              todaysTasks.map(
                (task) => (
                  <div
                    className={`task-card ${task.completed
                      ? "completed"
                      : ""
                      }`}
                    key={task.id}
                  >

                    <button
                      className="check-btn"
                      type="button"
                      onClick={async () => {
                        const newCompletedStatus = !task.completed;

                        const { error } = await supabase
                          .from("tasks")
                          .update({
                            completed: newCompletedStatus,
                          })
                          .eq("id", task.id)
                          .eq("user_id", session.user.id);

                        if (error) {
                          console.error("Error updating task:", error);
                          alert("Could not update the task.");
                          return;
                        }

                        setTasks((current) =>
                          current.map((item) =>
                            item.id === task.id
                              ? {
                                ...item,
                                completed: newCompletedStatus,
                              }
                              : item
                          )
                        );
                      }}
                    >
                      {task.completed
                        ? "✓"
                        : ""}
                    </button>

                    <div className="task-info">

                      <h3>
                        {task.title}
                      </h3>

                      <div className="task-meta">

                        <span className="category">
                          {task.category}
                        </span>

                        <span>
                          {task.difficulty}
                        </span>

                        <span className={`task-status ${task.completed ? "status-completed" : "status-pending"}`}>
                          {task.completed ? "✓ Completed" : "⏳ Pending"}
                        </span>

                      </div>

                    </div>

                    <div className="task-xp">
                      +{task.xp} XP
                    </div>
                    <button
                      className="edit-btn"
                      type="button"
                      onClick={() => setEditingTask(task)}
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      type="button"
                      onClick={() => setDeleteTask(task)}
                    >
                      🗑
                    </button>

                  </div>
                )
              )
            ) : (
              <div className="empty-tasks">

                <div className="empty-icon">
                  ✨
                </div>

                <h3>
                  No tasks for today
                </h3>

                <button
                  className="add-btn"
                  type="button"
                  onClick={() =>
                    setShowForm(true)
                  }
                >
                  + Add your first task
                </button>

              </div>
            )}

          </div>

          {/* =========================
              DAILY PROGRESS
          ========================= */}

          <div className="daily-progress">

            <div className="progress-header">

              <span>
                Daily Goal
              </span>

              <strong>
                {completedTasks}/
                {totalTasks} tasks
              </strong>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />

            </div>

            <div className="goal-status">

              <span>
                Streak goal:
                {" "}
                {DAILY_GOAL} completed tasks
              </span>

              {dailyGoalCompleted && (
                <span className="goal-complete">
                  🎉 Daily goal completed!
                  Your streak is protected.
                </span>
              )}

            </div>

          </div>

        </section>

        {/* =========================
            ACTIVITY
        ========================= */}

        <section className="activity-section">

          <div className="section-heading">

            <div>
              <h2>
                Activity
              </h2>

              <p>
                Your productivity over
                the latest six months
              </p>
            </div>

          </div>

          <div className="activity-card">
            <div className="activity-top">
              <strong>Productivity</strong>
              <span>Less ← Activity → More</span>
            </div>

            <div
              className="activity-months-wrapper"
              ref={activityScrollRef}
            >
              {activityMonths.map((month) => (
                <div className="activity-month" key={month.key}>
                  <h3>{month.name}</h3>

                  <div className="weekday-row">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>

                  <div className="activity-calendar-grid">
                    {Array.from({ length: month.mondayOffset }).map((_, index) => (
                      <div
                        className="activity-cell empty-cell"
                        key={`empty-${index}`}
                      />
                    ))}

                    {month.days.map((day) => {
                      let level = 0;

                      if (day.completedCount >= 3) {
                        level = 1;
                      }

                      return (
                        <div
                          key={day.key}
                          className={
                            refilledDates.includes(day.key)
                              ? "activity-cell refilled-cell"
                              : `activity-cell activity-level-${level}`
                          }
                          title={
                            refilledDates.includes(day.key)
                              ? `${day.dayName} — Refilled using XP`
                              : `${day.dayName} — ${day.completedCount} ${day.completedCount === 1 ? "task" : "tasks"
                              } completed`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="activity-legend">
              <div className="legend-item">
                <span className="legend-label">0</span>
                <span className="legend-box level-0"></span>
              </div>

              <div className="legend-item">
                <span className="legend-box streak-legend"></span>
                <span className="legend-label">Streak Day</span>
              </div>

              <div className="legend-item">
                <span className="legend-box refilled-legend">✓</span>
                <span className="legend-label">Refilled Day</span>
              </div>
            </div>
          </div>

        </section>

        {/* =========================
            WEEKLY HISTORY
        ========================= */}

        <section
          className="activity-section"
          id="history"
        >

          <div className="section-heading">

            <div>
              <h2>
                Weekly History
              </h2>

              <p>
                Real task completion
                for the last 7 days.
              </p>
            </div>

          </div>

          <div className="stats-grid">

            <div className="stat-card">

              <div className="stat-icon target">
                ✅
              </div>

              <div>

                <p>
                  Tasks Completed
                </p>

                <h2>
                  {weeklyCompleted}
                  <span>
                    /{weeklyTotal}
                  </span>
                </h2>

              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon xp">
                ⚡
              </div>

              <div>

                <p>
                  Weekly XP
                </p>

                <h2>
                  {weeklyXP}
                </h2>

              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon fire">
                🔥
              </div>

              <div>

                <p>
                  Goal Days
                </p>

                <h2>
                  {weeklyGoalDays}
                  <span>
                    /7
                  </span>
                </h2>

              </div>

            </div>

          </div>

          <div className="history-grid">

            {/* Daily completion */}

            <div className="activity-card">

              <div className="activity-top">

                <div>
                  <strong>
                    Daily completion
                  </strong>

                  <p className="history-description">
                    Percentage of tasks
                    completed each day
                  </p>
                </div>

                <span>
                  Last 7 days
                </span>

              </div>

              <div className="daily-chart">

                {weeklyHistory.map(
                  (day) => (
                    <div
                      className="chart-column"
                      key={day.key}
                    >

                      <strong
                        className={
                          day.percent > 0
                            ? "chart-percent active"
                            : "chart-percent"
                        }
                      >
                        {day.total > 0
                          ? `${day.percent}%`
                          : "—"}
                      </strong>

                      <div
                        className="chart-bar"
                        title={`${day.date}: ${day.completed} of ${day.total} tasks completed`}
                        style={{
                          height: `${day.total > 0
                            ? Math.max(
                              (day.percent /
                                100) *
                              150,
                              8
                            )
                            : 3
                            }px`,
                        }}
                      />

                      <div className="chart-label">
                        <strong>
                          {day.label}
                        </strong>

                        <small>
                          {day.completed}/
                          {day.total}
                        </small>
                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* Weekly completion */}

            <div className="activity-card">

              <div className="activity-top">

                <div>
                  <strong>
                    Weekly completion
                  </strong>

                  <p className="history-description">
                    Completed tasks this week
                  </p>
                </div>

              </div>

              <div className="donut-wrapper">

                <div
                  className="donut"
                  style={{
                    background:
                      weeklyTotal
                        ? `conic-gradient(#ec4899 0 ${weeklyPercent}%, #302a40 ${weeklyPercent}% 100%)`
                        : "#302a40",
                  }}
                >

                  <div className="donut-inner">

                    <strong>
                      {weeklyPercent}%
                    </strong>

                    <small>
                      completion
                    </small>

                  </div>

                </div>

                <div className="donut-legend">

                  <span>
                    <b className="done-dot">
                      ●
                    </b>
                    Done:{" "}
                    {weeklyCompleted}
                  </span>

                  <span>
                    <b className="left-dot">
                      ●
                    </b>
                    Left:{" "}
                    {Math.max(
                      weeklyTotal -
                      weeklyCompleted,
                      0
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* Daily breakdown */}

          <div
            className="activity-card breakdown-card"
          >

            <div className="activity-top">

              <strong>
                Daily breakdown
              </strong>

              <span>
                Streak goal: at least 3 tasks
              </span>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>

                    <th>
                      Date
                    </th>

                    <th>
                      Tasks
                    </th>

                    <th>
                      Completion
                    </th>

                    <th>
                      XP
                    </th>

                    <th>
                      Goal
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {[...weeklyHistory]
                    .reverse()
                    .map((day) => (
                      <tr
                        key={day.key}
                      >

                        <td>
                          {day.date}

                          {day.key ===
                            todayKey &&
                            " · Today"}
                        </td>

                        <td>
                          {day.completed}/
                          {day.total}
                        </td>

                        <td>
                          {day.percent}%
                        </td>

                        <td>
                          +{day.xp} XP
                        </td>

                        <td>
                          {day.goalReached
                            ? "✅ Completed"
                            : "○ Not completed"}
                        </td>

                      </tr>
                    ))}

                </tbody>

              </table>

            </div>

          </div>

        </section>

        {/* =========================
            STREAK REFILL
        ========================= */}

        <section
          className="activity-section"
          id="refill"
        >

          <div className="section-heading">

            <div>

              <h2>
                Streak Refill
              </h2>

              <p>
                Restore missed days using{" "}
                {REFILL_COST} XP per day.
              </p>

            </div>

          </div>

          <div className="activity-card">

            {!refillCandidates.length ? (
              <div className="empty-tasks">

                <div className="empty-icon">
                  ✨
                </div>

                <h3>
                  No missed streak days
                  to refill
                </h3>

              </div>
            ) : (
              <>
                <div className="stats-grid">

                  <div className="stat-card">

                    <div className="stat-icon fire">
                      🔥
                    </div>

                    <div>
                      <p>
                        Missed Days
                      </p>

                      <h2>
                        {
                          refillCandidates.length
                        }
                      </h2>
                    </div>

                  </div>

                  <div className="stat-card">

                    <div className="stat-icon xp">
                      ⚡
                    </div>

                    <div>
                      <p>
                        Available XP
                      </p>

                      <h2>
                        {availableXP}
                      </h2>
                    </div>

                  </div>

                  <div className="stat-card">

                    <div className="stat-icon target">
                      💎
                    </div>

                    <div>
                      <p>
                        Refill Cost
                      </p>

                      <h2>
                        {REFILL_COST}
                        <span>
                          XP/day
                        </span>
                      </h2>
                    </div>

                  </div>

                </div>

                {maxRefillDays ? (
                  <div className="refill-controls">

                    <strong>
                      Days to refill:
                    </strong>

                    <select
                      value={refillDays}
                      onChange={(event) =>
                        setRefillDays(
                          Number(
                            event.target.value
                          )
                        )
                      }
                    >

                      {Array.from(
                        {
                          length:
                            maxRefillDays,
                        },
                        (_, index) => (
                          <option
                            key={
                              index + 1
                            }
                            value={
                              index + 1
                            }
                          >
                            {index + 1} day
                            {index
                              ? "s"
                              : ""}
                          </option>
                        )
                      )}

                    </select>

                    <strong>
                      Cost: {refillCost} XP
                    </strong>

                    <button
                      className="add-btn"
                      type="button"
                      onClick={
                        refillStreak
                      }
                    >
                      🔥 Refill Streak
                    </button>

                  </div>
                ) : (
                  <p className="goal-complete">
                    You need at least{" "}
                    {REFILL_COST} XP to
                    refill one missed day.
                  </p>
                )}
              </>
            )}

          </div>

        </section>

        {/* =========================
            ACHIEVEMENTS
        ========================= */}

        <section
          className="achievements-section"
          id="achievements"
        >

          <div className="section-heading">

            <div>

              <h2>
                Achievements
              </h2>

              <p>
                Keep going and unlock
                new milestones.
              </p>

            </div>

          </div>

          <div className="achievement-grid">

            {[
              [3, "🔥"],
              [7, "⚡"],
              [30, "🏆"],
            ].map(
              ([days, icon]) => (
                <div
                  className="achievement-card"
                  key={days}
                >

                  <div className="achievement-icon">
                    {icon}
                  </div>

                  <div>

                    <h3>
                      {days} Day Streak
                    </h3>

                    <p>
                      Maintain a {days} day
                      streak
                    </p>

                    <div className="achievement-progress">

                      <div
                        style={{
                          width: `${Math.min(
                            (bestStreak /
                              days) *
                            100,
                            100
                          )
                            }%`,
                        }}
                      />

                    </div>

                    <small>
                      {Math.min(
                        bestStreak,
                        days
                      )}{" "}
                      / {days}
                    </small>

                  </div>

                </div>
              )
            )}

          </div>

        </section>
        <section className="profile-page-section">

  <div className="profile-page-header">
    <div className="profile-large-avatar">
      {profileInitials}
    </div>

    <div className="profile-header-info">
      <p className="section-label">YOUR PROFILE</p>
      <h2>{profileName}</h2>
      <p>{session?.user?.email}</p>
    </div>
  </div>


  <div className="profile-stats-grid">

    <div className="profile-stat-card">
      <span>🔥</span>
      <p>Current Streak</p>
      <strong>{currentStreak} days</strong>
    </div>

    <div className="profile-stat-card">
      <span>🏆</span>
      <p>Best Streak</p>
      <strong>{bestStreak} days</strong>
    </div>

    <div className="profile-stat-card">
      <span>⚡</span>
      <p>Available XP</p>
      <strong>{availableXP} XP</strong>
    </div>

    <div className="profile-stat-card">
      <span>✅</span>
      <p>Completed Tasks</p>
      <strong>
        {tasks.filter((task) => task.completed).length}
      </strong>
    </div>

    <div className="profile-stat-card">
      <span>📅</span>
      <p>Active Days</p>
      <strong>{completedDates.length}</strong>
    </div>

    <div className="profile-stat-card">
      <span>🎯</span>
      <p>Today's Goal</p>
      <strong>
        {Math.min(
          tasks.filter(
            (task) =>
              task.date === todayKey &&
              task.completed
          ).length,
          DAILY_GOAL
        )} / {DAILY_GOAL}
      </strong>
    </div>

  </div>


  <div className="profile-progress-card">

    <div className="profile-card-heading">
      <div>
        <p className="section-label">PRODUCTIVITY</p>
        <h3>Task Completion</h3>
      </div>

      <strong>
        {tasks.length
          ? Math.round(
              (tasks.filter(
                (task) => task.completed
              ).length /
                tasks.length) *
                100
            )
          : 0}%
      </strong>
    </div>

    <div className="profile-progress-track">
      <div
        className="profile-progress-fill"
        style={{
          width: `${
            tasks.length
              ? Math.round(
                  (tasks.filter(
                    (task) => task.completed
                  ).length /
                    tasks.length) *
                    100
                )
              : 0
          }%`,
        }}
      />
    </div>

  </div>


  <div className="profile-progress-card">

    <div className="profile-card-heading">
      <div>
        <p className="section-label">STREAK JOURNEY</p>
        <h3>Achievement Progress</h3>
      </div>
    </div>

    <div className="profile-milestone">

      <div className="profile-milestone-info">
        <span>🔥 3 Day Streak</span>
        <strong>
          {Math.min(bestStreak, 3)} / 3
        </strong>
      </div>

      <div className="profile-progress-track">
        <div
          className="profile-progress-fill"
          style={{
            width: `${Math.min(
              (bestStreak / 3) * 100,
              100
            )}%`,
          }}
        />
      </div>

    </div>


    <div className="profile-milestone">

      <div className="profile-milestone-info">
        <span>⚡ 7 Day Streak</span>
        <strong>
          {Math.min(bestStreak, 7)} / 7
        </strong>
      </div>

      <div className="profile-progress-track">
        <div
          className="profile-progress-fill"
          style={{
            width: `${Math.min(
              (bestStreak / 7) * 100,
              100
            )}%`,
          }}
        />
      </div>

    </div>


    <div className="profile-milestone">

      <div className="profile-milestone-info">
        <span>🏆 30 Day Streak</span>
        <strong>
          {Math.min(bestStreak, 30)} / 30
        </strong>
      </div>

      <div className="profile-progress-track">
        <div
          className="profile-progress-fill"
          style={{
            width: `${Math.min(
              (bestStreak / 30) * 100,
              100
            )}%`,
          }}
        />
      </div>

    </div>

  </div>

</section>
        {editingTask && (
          <div className="modal-overlay">
            <div className="edit-modal">
              <div className="edit-modal-header">
                <div>
                  <p className="modal-label">EDIT TASK</p>
                  <h2>Edit Task</h2>
                </div>

                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setEditingTask(null)}

                >
                  ×
                </button>
              </div>

              <div className="edit-form">
                <label>
                  Task title
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        title: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Category
                  <select
                    value={editingTask.category}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        category: event.target.value,
                      })
                    }
                  >
                    <option value="Coding">Coding</option>
                    <option value="College">College</option>
                    <option value="Personal">Personal</option>
                    <option value="Projects">Projects</option>
                  </select>
                </label>

                <label>
                  Difficulty
                  <select
                    value={editingTask.difficulty}
                    onChange={(event) =>
                      setEditingTask({
                        ...editingTask,
                        difficulty: event.target.value,
                        xp: XP_VALUES[event.target.value],
                      })
                    }
                  >
                    <option value="Easy">Easy — 10 XP</option>
                    <option value="Medium">Medium — 20 XP</option>
                    <option value="Hard">Hard — 30 XP</option>
                  </select>
                </label>

                <div className="edit-modal-actions">
                  <button
                    className="cancel-edit-btn"
                    type="button"
                    onClick={() => setEditingTask(null)}
                  >
                    Cancel
                  </button>

                  <button
                    className="save-edit-btn"
                    type="button"
                    onClick={async () => {
                      const title = editingTask.title.trim();

                      if (!title) return;

                      const { error } = await supabase
                        .from("tasks")
                        .update({
                          title,
                          category: editingTask.category,
                          difficulty: editingTask.difficulty,
                          xp: XP_VALUES[editingTask.difficulty],
                        })
                        .eq("id", editingTask.id)
                        .eq("user_id", session.user.id);

                      if (error) {
                        console.error("Error updating task:", error);
                        alert("Could not update the task.");
                        return;
                      }

                      setTasks((current) =>
                        current.map((item) =>
                          item.id === editingTask.id
                            ? {
                              ...item,
                              title,
                              category: editingTask.category,
                              difficulty: editingTask.difficulty,
                              xp: XP_VALUES[editingTask.difficulty],
                            }
                            : item
                        )
                      );

                      setEditingTask(null);
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {deleteTask && (
          <div className="modal-overlay">
            <div className="delete-modal">

              <div className="delete-modal-icon">
                🗑
              </div>

              <div className="delete-modal-content">
                <h2>Delete task?</h2>

                <p>
                  Are you sure you want to delete{" "}
                  <strong>"{deleteTask.title}"</strong>?
                </p>

                <span>
                  This action cannot be undone.
                </span>
              </div>

              <div className="delete-modal-actions">

                <button
                  type="button"
                  className="delete-cancel-btn"
                  onClick={() => setDeleteTask(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="delete-confirm-btn"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("tasks")
                      .delete()
                      .eq("id", deleteTask.id)
                      .eq("user_id", session.user.id);

                    if (error) {
                      console.error(
                        "Error deleting task:",
                        error
                      );

                      alert(
                        "Could not delete the task."
                      );

                      return;
                    }

                    setTasks((current) =>
                      current.filter(
                        (item) =>
                          item.id !== deleteTask.id
                      )
                    );

                    setDeleteTask(null);
                  }}
                >
                  Delete Task
                </button>

              </div>

            </div>
          </div>
        )}

      </main>

    </div>
  );
}

export default App;