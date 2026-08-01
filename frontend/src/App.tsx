import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { AnalystPage } from "@/pages/AnalystPage";
import { CommoditiesPage } from "@/pages/CommoditiesPage";
import { CommodityDetailPage } from "@/pages/CommodityDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ManageDataPage } from "@/pages/ManageDataPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="commodities" element={<CommoditiesPage />} />
        <Route path="commodities/:slug" element={<CommodityDetailPage />} />
        <Route path="analyst" element={<AnalystPage />} />
        <Route path="manage" element={<ManageDataPage />} />
        <Route path="not-found" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/not-found" replace />} />
      </Route>
    </Routes>
  );
}
