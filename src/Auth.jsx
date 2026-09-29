import { useState } from "react";
import { supabase } from "./supabaseClient";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setOtpSent(true);
      setMessage("OTP sent! Please check your email.");
    }

    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  const handleSignup = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
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

    setLoading(false);
  };

  const switchMode = () => {
    setIsLogin((current) => !current);
    setOtpSent(false);
    setOtp("");
    setPassword("");
    setError("");
    setMessage("");
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
            {isLogin
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>
            {isLogin
              ? "Sign in with your email OTP."
              : "Build your streak. Stay consistent."}
          </p>
        </div>

        {isLogin ? (
          <>
            {!otpSent ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendOtp();
                }}
                className="auth-form"
              >

                <label>
                  Email

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                  />
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
                    ? "Sending OTP..."
                    : "Send OTP"}
                </button>

              </form>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  verifyOtp();
                }}
                className="auth-form"
              >

                <label>
                  Enter OTP

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value)
                    }
                    maxLength={6}
                    required
                  />
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
                    ? "Verifying..."
                    : "Verify OTP"}
                </button>

                <button
                  type="button"
                  className="auth-back-button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setError("");
                    setMessage("");
                  }}
                >
                  ← Change email
                </button>

              </form>
            )}
          </>
        ) : (
          <form
            onSubmit={handleSignup}
            className="auth-form"
          >

            <label>
              Full name

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
              />
            </label>

            <label>
              Email

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </label>

            <label>
              Password

              <div className="password-wrapper">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={6}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
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
                ? "Creating account..."
                : "Create Account"}
            </button>

          </form>
        )}

        <div className="auth-switch">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={switchMode}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={switchMode}
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