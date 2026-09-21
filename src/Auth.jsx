import { useState } from "react";
import { supabase } from "./supabaseClient";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    if (!isLogin && !name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account."
        );
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span>🔥</span>
          <strong>StreakUp</strong>
        </div>

        <div className="auth-header">
          <p className="auth-label">
            {isLogin ? "WELCOME BACK" : "GET STARTED"}
          </p>

          <h1>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>

          <p>
            {isLogin
              ? "Sign in to continue your streak."
              : "Build your streak. Stay consistent."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <label>
              Full name
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
  Password

  <div className="password-wrapper">
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Enter your password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      minLength={6}
      required
    />

    <button
      type="button"
      className="password-toggle"
      onClick={() => setShowPassword((current) => !current)}
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      👁
    </button>
  </div>
</label>
          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message auth-success">
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                  setMessage("");
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                  setMessage("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;