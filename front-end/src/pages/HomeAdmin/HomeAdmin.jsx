import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Tabs, Form, Input, Button, Typography, Row, Col } from "antd";
import "./homeadmin.css";
import AgencyHeader from "./AgencyHeader";
import Swal from "sweetalert2";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";
import { FloatButton } from "antd";
import { signUp, login, forgotPassword, resendVerification } from "../../services/api";
import CryptoJS from "crypto-js";
import { getConfig } from "../../utils/config";
import { setOpaqueItem } from "../../utils/encryptedStorage";
import { setEncryptedItem } from "../../utils/encryptedStorage";

function HomeAdmin({ toggleColorScheme, colorScheme }) {
  const [activeTab, setActiveTab] = useState("login");
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [signupForm] = Form.useForm();
  const params = new URLSearchParams(location.search);
  const [loginForm] = Form.useForm();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "true") {
      setActiveTab("login");
    }
  }, [location, navigate]);

  const handleLogin = async ({ username, password }) => {
    setLoading(true);
    try {
      const res = await login({ username, password });

      // Hide keys by storing under obfuscated storage keys
  setOpaqueItem("token", res.data.token);
  // Store user data encrypted using setEncryptedItem for compatibility
  setEncryptedItem("user", JSON.stringify(res.data.user));

    // Navigate to admin without full reload to avoid static host 404 flash
    navigate("/admin");
    } catch (err) {
      console.error("Login error:", err);
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.response?.data?.message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async ({ fullname, username, email, password }) => {
    setLoading(true);
    try {
      const res = await signUp({ fullname, username, email, password });

      Swal.fire({
        icon: "success",
        title: "Success",
        text:
          res.data.message ||
          "Verification email sent. Please check your inbox.",
      });

      signupForm.resetFields(); // Clear the signup form
      setActiveTab("login"); // Switch to login tab
    } catch (err) {
      console.error("Signup error:", err);
      const msg = err.response?.data?.message || "";
      // Live backend may create user but fail sending email. Auto-resend to reduce friction.
      if (msg.includes("User created, but failed to send verification email")) {
        try {
          await resendVerification({ email });
          Swal.fire({
            icon: "success",
            title: "Verification Email Re-sent",
            text: "We sent a new verification link to your email. Please check your inbox.",
          });
          signupForm.resetFields();
          setActiveTab("login");
        } catch (resendErr) {
          console.error("Resend verification failed:", resendErr);
          Swal.fire({
            icon: "error",
            title: "Email Delivery Issue",
            text:
              resendErr.response?.data?.message ||
              "We couldn't send the verification email right now. Please try again later or contact support.",
          });
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: msg || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const { value: email } = await Swal.fire({
      title: "Forgot Password",
      input: "email",
      inputLabel: "Enter your registered email",
      inputPlaceholder: "example@email.com",
      confirmButtonText: "Submit",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "Email is required";
      },
    });

    if (email) {
      setLoading(true);
      try {
        const res = await forgotPassword(email);
        Swal.fire({
          icon: "success",
          title: "Email Sent",
          text:
            res.data.message ||
            "Please check your email for reset instructions.",
        });
      } catch (err) {
        console.error("Forgot Password error:", err);
        Swal.fire({
          icon: "error",
          title: "Failed",
          text: err.response?.data?.message || "Unable to send reset email.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      {" "}
      <div className="home-container">
        <div className="home-background-circles">
          <div className="circle circle1" />
          <div className="circle circle2" />
          <div className="circle circle3" />
          <div className="circle circle4" />
          <div className="circle circle5" />
        </div>
        <AgencyHeader /> {/* <-- Add this line */}
        <div className="form-wrapper">
          <Card className="auth-card">
            <h2 className="auth-title">ADMINISTRATION PANEL</h2>
            <p className="auth-subtitle">Sign in to manage surveys, reports, and system configurations.</p>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              items={[
                {
                  key: "login",
                  label: "Login",
                  children: (
                    <Form
                      form={loginForm}
                      layout="vertical"
                      onFinish={handleLogin}
                      disabled={loading}
                    >
                      <Form.Item
                        label="Username"
                        name="username"
                        rules={[
                          { required: true, message: "Username is required" },
                        ]}
                      >
                        <Input placeholder="Enter your username" />
                      </Form.Item>
                      <Form.Item
                        label="Password"
                        name="password"
                        rules={[
                          { required: true, message: "Password is required" },
                        ]}
                      >
                        <Input.Password placeholder="Enter your password" />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          loading={loading}
                        >
                          {loading ? "Logging In..." : "Login"}
                        </Button>
                      </Form.Item>
                      <Form.Item>
                        <Typography.Link
                          onClick={handleForgotPassword}
                          style={{ float: "right", fontSize: "0.85rem" }}
                        >
                          Forgot Password?
                        </Typography.Link>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: "signup",
                  label: "Sign Up",
                  children: (
                    <Form
                      form={signupForm} // Add this prop
                      layout="vertical"
                      onFinish={({ confirm, ...formData }) =>
                        handleSignup(formData)
                      }
                      disabled={loading}
                    >
                      <Form.Item
                        label="Full Name"
                        name="fullname"
                        rules={[
                          { required: true, message: "Full name is required" },
                        ]}
                      >
                        <Input placeholder="Enter your full name" />
                      </Form.Item>
                      <Form.Item
                        label="Username"
                        name="username"
                        rules={[
                          { required: true, message: "Username is required" },
                        ]}
                      >
                        <Input placeholder="Enter your username" />
                      </Form.Item>
                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          { required: true, message: "Email is required" },
                          { type: "email", message: "Please enter a valid email" },
                        ]}
                      >
                        <Input placeholder="Enter your email" />
                      </Form.Item>
                      <Form.Item
                        label="Password"
                        name="password"
                        rules={[
                          { required: true, message: "Password is required" },
                          { min: 8, message: "Password must be at least 8 characters" },
                        ]}
                      >
                        <Input.Password placeholder="Enter your password" />
                      </Form.Item>
                      <Form.Item
                        label="Confirm Password"
                        name="confirm"
                        dependencies={["password"]}
                        rules={[
                          {
                            required: true,
                            message: "Please confirm your password",
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (
                                !value ||
                                getFieldValue("password") === value
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error("Passwords do not match")
                              );
                            },
                          }),
                        ]}
                      >
                        <Input.Password placeholder="Confirm your password" />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          block
                          loading={loading}
                        >
                          {loading ? "Signing Up..." : "Sign Up"}
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>
      <FloatButton
        type="text"
        icon={colorScheme === "dark" ? <BulbFilled /> : <BulbOutlined />}
        onClick={toggleColorScheme}
        tooltip={<div>Toggle Theme</div>}
      />
    </>
  );
}

export default HomeAdmin;
