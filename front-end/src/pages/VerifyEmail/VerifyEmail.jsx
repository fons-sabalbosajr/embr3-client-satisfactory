import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { verifyEmail } from "../../services/api";

function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token || !email) {
        Swal.fire({
          icon: "error",
          title: "Invalid Link",
          text: "Missing token or email in verification link.",
        });
        navigate("/");
        return;
      }

      try {
        const res = await verifyEmail({ token, email });

        Swal.fire({
          icon: "success",
          title: "Email Verified",
          text: res.data.message || "You may now log in.",
        }).then(() => {
          navigate("/admin");
        });
      } catch (err) {
        console.error("Verification failed:", err);
        Swal.fire({
          icon: "error",
          title: "Verification Failed",
          text:
            err.response?.data?.message ||
            "Something went wrong. Please try again.",
        }).then(() => {
          navigate("/admin");
        });
      }
    };

    verifyEmail();
  }, []);

  return null; // No UI, just logic + redirect
}

export default VerifyPage;
