import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFarmerCrops } from "../../api/crops";
import logo from "../../images/logo.jpeg";
import { bookingsAPI } from "../../api/client";
const quickActions = [
  {
    label: "My Crops",
    description: "Manage your crops",
    path: "/crops",
    icon: "🌱",
    accent: "green",
  },
  {
    label: "Book a Slot",
    description: "Schedule your visit",
    path: "/centres",
    icon: "📅",
    accent: "blue",
  },
  // {
  //   label: "Find Centres",
  //   description: "Discover nearby centres",
  //   path: "/centres",
  //   icon: "📍",
  //   accent: "amber",
  // },
  {
    label: "Booking History",
    description: "View past bookings",
    path: "/bookings",
    icon: "☷",
    accent: "purple",
  },
  {
    label: "Queue Tracker",
    description: "Check live status",
    path: "/queue-tracker",
    icon: "▥",
    accent: "rose",
  },
];

const accentClasses = {
  green:
    "bg-green-50 border-green-100 text-green-700 hover:border-green-300 hover:bg-green-100",
  blue: "bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
  amber:
    "bg-amber-50 border-amber-100 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
  purple:
    "bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-300 hover:bg-purple-100",
  rose: "bg-rose-50 border-rose-100 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
};

const StatIcon = ({ children }) => (
  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-sm">
    {children}
  </div>
);

export const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [crops, setCrops] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [cropResponse, bookingResponse] = await Promise.all([
          getFarmerCrops(),
          bookingsAPI.list({ limit: 100 }),
        ]);

        if (cropResponse?.success) {
          setCrops(cropResponse.crops || []);
        }

        const bookingData =
          bookingResponse?.data?.data || bookingResponse?.data || [];

        setBookings(Array.isArray(bookingData) ? bookingData : []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const totalCrops = crops.length;

  const availableCrops = crops.filter(
    (crop) => crop.status === "AVAILABLE",
  ).length;

  const pendingCrops = crops.filter((crop) => crop.status === "PENDING").length;

  const upcomingBookings = bookings.filter((booking) => {
    // These bookings are no longer upcoming
    if (
      ["PROCURED", "COMPLETED", "REJECTED", "CANCELLED"].includes(
        booking.status,
      )
    ) {
      return false;
    }

    // Booking must have a slot
    if (!booking.slot?.slotDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slotDate = new Date(booking.slot.slotDate);
    slotDate.setHours(0, 0, 0, 0);

    return slotDate >= today;
  });

  const totalUpcomingBookings = upcomingBookings.length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const firstName = user?.name?.split(" ")?.[0] || "Farmer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-green-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center"
            aria-label="Go to dashboard"
          >
            <img
              src={logo}
              alt="Smart Farmer Procurement System"
              className="h-14 w-auto max-w-[210px] object-contain scale-150"
            />
          </button>

          <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <h1 className="text-lg font-bold tracking-tight text-slate-800 lg:text-xl">
              Farmer Dashboard
            </h1>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm transition hover:border-green-300 hover:bg-green-50"
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-lg">
                👤
              </span>
              <span className="hidden max-w-[100px] truncate text-sm font-semibold text-slate-700 sm:block">
                {firstName}
              </span>
              <span
                className={`text-xs text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 -z-10 h-full w-full cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-xl">
                        👤
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">
                          {user?.name || "Farmer"}
                        </p>
                        <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                          Farmer
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="text-lg">👤</span>
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <span className="text-lg">↪</span>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-green-50 px-4 py-2 text-center md:hidden">
          <p className="text-sm font-bold text-slate-800">Farmer Dashboard</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <section className="relative mb-7 overflow-hidden rounded-3xl border border-green-100 bg-gradient-to-r from-green-100 via-emerald-50 to-lime-50 shadow-sm">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/50" />
          <div className="absolute right-24 top-8 h-20 w-20 rounded-full bg-yellow-100/70" />
          <div className="absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-green-200/40" />

          <div className="relative grid min-h-[250px] items-center md:grid-cols-[1fr_360px]">
            <div className="px-6 py-8 sm:px-9 sm:py-10 lg:px-11">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-green-700">
                Smart Farmer Procurement
              </p>
              <h2 className="max-w-2xl text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Welcome back, {firstName}!{" "}
                <span className="inline-block">🌱</span>
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Grow more. Wait less. Manage your crops, book procurement slots,
                and track your queue in real-time.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/centres")}
                  className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 hover:shadow-md"
                >
                  Book a Slot →
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/queue-tracker")}
                  className="rounded-xl border border-green-200 bg-white/80 px-5 py-3 text-sm font-bold text-green-700 transition hover:bg-white"
                >
                  Track My Queue
                </button>
              </div>
            </div>
            <div className="hidden h-full items-end justify-center md:flex">
              <div className="mb-6 mr-8 rounded-full bg-white/60 p-8 text-8xl shadow-sm">
                🌾
              </div>
            </div>
          </div>
        </section>

        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total Crops
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {totalCrops}
                </p>
                <p className="mt-1 text-xs font-semibold text-green-600">
                  {availableCrops} available
                </p>
              </div>
              <StatIcon>🌱</StatIcon>
            </div>
          </div>

          <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Upcoming Bookings
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {totalUpcomingBookings}
                </p>
                <p className="mt-1 text-xs font-semibold text-blue-600">
                  Upcoming bookings
                </p>
              </div>
              <StatIcon>📅</StatIcon>
            </div>
          </div>

          <div className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Queue Status
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  Normal
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  Estimated wait: {Math.max(15, totalCrops * 8)} min
                </p>
              </div>
              <StatIcon>👥</StatIcon>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/centres")}
            className="group rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Nearby Centres
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">—</p>
                <p className="mt-1 text-xs font-semibold text-purple-600">
                  Find a centre →
                </p>
              </div>
              <StatIcon>📍</StatIcon>
            </div>
          </button>
        </section>

        <section className="mb-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Quick Actions
                </h2>
              </div>
              <p className="mt-1 pl-9 text-sm text-slate-500">
                Everything you need, in one place
              </p>
            </div>
            <span className="hidden text-sm font-bold text-green-700 sm:block">
              Farmer Services
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${accentClasses[action.accent]}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                    {action.icon}
                  </span>
                  <span className="text-lg opacity-70 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
                <p className="font-extrabold text-slate-800">{action.label}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* <section className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-h-[250px] rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">
                  ◷
                </span>
                <h2 className="font-extrabold text-slate-900">
                  Recent Activity
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/bookings")}
                className="text-sm font-bold text-green-700 hover:text-green-800"
              >
                View All →
              </button>
            </div>
            <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-2xl">
                ▤
              </div>
              <p className="mt-3 font-bold text-slate-700">
                No recent activity
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Your bookings and activities will appear here
              </p>
            </div>
          </div>

          <div className="min-h-[250px] rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">
                  📅
                </span>
                <h2 className="font-extrabold text-slate-900">
                  Upcoming Bookings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/bookings")}
                className="text-sm font-bold text-green-700 hover:text-green-800"
              >
                View All →
              </button>
            </div>
            <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-2xl">
                📅
              </div>
              <p className="mt-3 font-bold text-slate-700">
                No upcoming bookings
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Book a slot at your nearest centre to get started
              </p>
              <button
                type="button"
                onClick={() => navigate("/centres")}
                className="mt-4 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700"
              >
                📅 Book Now
              </button>
            </div>
          </div>
        </section> */}

        <section className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                About Smart Farmer Procurement
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Welcome to the Smart Farmer Procurement System! This platform
                helps reduce waiting times at procurement centres and provides
                real-time queue management.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["🌱", "Register your crops", "Manage crops and farming details"],
              ["📍", "Discover centres", "Find nearby procurement centres"],
              ["📅", "Book slots", "Avoid unnecessary waiting"],
              ["👥", "Track your status", "Follow your queue in real-time"],
              ["🔔", "Receive notifications", "Stay updated about bookings"],
              ["📊", "View status", "Check quality and payment status"],
            ].map(([icon, title, description]) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl bg-white/75 p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-2 px-1 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Smart Farmer Procurement System. All rights reserved.</p>
          <p className="font-medium">
            🌱 Supporting Farmers. Building a Better Tomorrow.
          </p>
        </footer>
      </main>
    </div>
  );
};
