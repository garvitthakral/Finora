import React from "react";
import DashBody from "./components/body";
import Sidebar from "./components/sidebar";

const dashboard = () => {
  return (
    <div>
      <Sidebar />
      <DashBody />
    </div>
  );
};

export default dashboard;
