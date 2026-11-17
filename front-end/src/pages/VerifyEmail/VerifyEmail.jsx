// Email verification (link from the sign-up email). Shows the check in
// progress, then the result, instead of a blank page with pop-ups.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "antd";
import { MailOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from "@ant-design/icons";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { describeError } from "../../components/StatusUI/describeError";
import { verifyEmail as verifyEmailApi } from "../../services/api";

function VerifyPage({ colorScheme, toggleColorScheme }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: "busy", message: "" });
  const ran = useRef(false);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (ran.current) return; // the link is single-use; never call it twice
    ran.current = true;
    if (!token || !email) {
      setState({ phase: "bad", message: "The verification link is missing information. Open the link from your email again." });
      return;
    }
    verifyEmailApi({ token, email })
      .then((res) => setState({ phase: "ok", message: res?.data?.message || "Your email is verified. You can now sign in." }))
      .catch((err) => {
        console.error("Verification failed:", err);
        setState({ phase: "bad", message: describeError(err).message || "We couldn't verify your email." });
      });
  }, [token, email]);

  const copy = {
    busy: { title: "Verifying your email…", icon: <LoadingOutlined />, cls: "is-busy" },
    ok: { title: "Email verified", icon: <CheckCircleFilled />, cls: "is-ok" },
    bad: { title: "Verification failed", icon: <CloseCircleFilled />, cls: "is-bad" },
  }[state.phase];

  return (
    <AuthLayout colorScheme={colorScheme} toggleColorScheme={toggleColorScheme} icon={<MailOutlined />} title={copy.title} subtitle={email || undefined}>
      <div className="auth-status" role={state.phase === "bad" ? "alert" : "status"} aria-live="polite">
        <span className={`auth-status-icon ${copy.cls}`}>{copy.icon}</span>
        <p>{state.phase === "busy" ? "This only takes a moment." : state.message}</p>
        {state.phase !== "busy" && (
          <Button
            type="primary"
            block
            className="auth-submit"
            onClick={() => navigate(state.phase === "ok" ? "/admin?verified=true" : "/admin", { replace: true })}
          >
            Go to sign in
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}

export default VerifyPage;
