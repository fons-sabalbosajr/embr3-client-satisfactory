import React from "react";
import { Result } from "antd";

export default function MaintenancePage() {
  return (
    <Result
      status="warning"
      title="System Maintenance"
      subTitle="The admin portal is currently under maintenance. Please try again later. Client-side features remain available."
    />
  );
}
