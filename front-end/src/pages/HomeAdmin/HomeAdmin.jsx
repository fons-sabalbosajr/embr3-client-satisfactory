import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Tabs, Form, Input, Button, Typography, Row, Col } from "antd";
import "./homeadmin.css";
import AgencyHeader from "./AgencyHeader";
import Swal from "sweetalert2";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";
import { FloatButton } from "antd";
import { signUp, login } from "../../services/api";
import CryptoJS from "crypto-js";

const secretKey = import.meta.env.VITE_SECRET_KEY;

function HomeAdmin({ toggleColorScheme, colorScheme }) {
  const [activeTab, setActiveTab] = useState("login");
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [signupForm] = Form.useForm();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/admin");
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "true") {
      setActiveTab("login");
    }
  }, [location, navigate]);

  const handleLogin = async ({ username, password }) => {
    setLoading(true);
    try {
      const res = await login({ username, password });

      // Encrypt and store user info
      const encryptedUser = CryptoJS.AES.encrypt(
        JSON.stringify(res.data.user),
        secretKey
      ).toString();

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", encryptedUser);

      // ⏩ Redirect to admin page
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err.response?.data?.message ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
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
                        ]}
                      >
                        <Input placeholder="Enter your email" />
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
