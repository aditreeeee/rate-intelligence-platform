import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { PropertyContextProvider } from "./context/PropertyContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AuthGuard } from "./components/layout/AuthGuard.jsx";
import { PortalLayout } from "./components/layout/PortalLayout.jsx";
import { Login } from "./pages/Login.jsx";
import { PropertiesPage } from "./pages/properties/PropertiesPage.jsx";
import { PropertyProfilePage } from "./pages/properties/PropertyProfilePage.jsx";
import { RoomsPage } from "./pages/rooms/RoomsPage.jsx";
import { RoomProfilePage } from "./pages/rooms/RoomProfilePage.jsx";
import { RatePlansPage } from "./pages/ratePlans/RatePlansPage.jsx";
import { SettingsPage } from "./pages/settings/SettingsPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <PropertyContextProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/portal"
                element={
                  <AuthGuard>
                    <PortalLayout />
                  </AuthGuard>
                }
              >
                <Route index element={<Navigate to="properties" replace />} />
                <Route path="properties" element={<PropertiesPage />} />
                <Route path="properties/:id" element={<PropertyProfilePage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="rooms/:id" element={<RoomProfilePage />} />
                <Route path="rate-plans" element={<RatePlansPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
        </PropertyContextProvider>
      </DataProvider>
    </AuthProvider>
  );
}
