import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCursorGlow } from "../hooks/useCursorGlow.js";

function Particles({ count = 22 }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 14,
        duration: 14 + Math.random() * 12,
      })),
    [count]
  );
  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const panelGlow = useCursorGlow();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      setLoading(false);
      if (result.ok) {
        navigate("/portal/properties", { replace: true });
      } else {
        setError(result.error);
      }
    }, 450);
  };

  return (
    <div className="login-page">
      <svg className="login-waves" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path className="login-waves__path login-waves__path--1" d="M0,160 C320,240 420,80 720,140 C1020,200 1120,60 1440,140 L1440,320 L0,320 Z" />
        <path className="login-waves__path login-waves__path--2" d="M0,220 C300,140 480,260 760,200 C1040,140 1200,240 1440,200 L1440,320 L0,320 Z" />
      </svg>
      <div className="blob blob--1" aria-hidden="true" />
      <div className="blob blob--2" aria-hidden="true" />
      <div className="blob blob--3" aria-hidden="true" />
      <Particles />

      <img
        className="login-logo"
        src="https://www.eglobe-solutions.com/img/logo-dark.webp"
        alt="eGlobe Solutions"
      />

      <div className="login-card">
        <div
          className="login-card__visual"
          ref={panelGlow.ref}
          onMouseMove={panelGlow.onMouseMove}
          onMouseLeave={panelGlow.onMouseLeave}
        >
          <div className="login-card__visual-glow" />
          <div className="login-card__visual-light" />
          <div className="login-card__visual-content">
            <span className="login-card__eyebrow">Rate Intelligence</span>
            <h2 className="login-card__visual-title display">
              See every rate,
              <br />
              every market,
              <br />
              in one view.
            </h2>
            <p className="login-card__visual-copy">
              Unified property, room, and rate-plan intelligence built for
              modern hospitality portfolios.
            </p>
          </div>
        </div>

        <div className="login-card__form-panel">
          <h1 className="login-card__title display">Welcome back</h1>
          <p className="login-card__subtitle">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="username" className="field__label">Username</label>
              <div className="input-with-icon">
                <User size={16} strokeWidth={2} className="input-with-icon__icon" />
                <input
                  id="username"
                  className="input"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password" className="field__label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} strokeWidth={2} className="input-with-icon__icon" />
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={15} strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn--primary btn--lg login-submit" disabled={loading}>
              {loading ? <span className="btn__spinner" /> : <>Sign In <ArrowRight size={17} strokeWidth={2} /></>}
            </button>
          </form>

          <p className="login-footer">eGlobe Solutions &bull; Rate Intelligence Platform</p>
        </div>
      </div>
    </div>
  );
}
