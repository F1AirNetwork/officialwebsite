import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

import Navbar         from "./components/Navbar";
import Footer         from "./components/Footer";

import Home           from "./pages/Home";
import Livestream     from "./pages/Livestream";
import Store          from "./pages/Store";
import About          from "./pages/About";
import Contact        from "./pages/Contact";
import Login          from "./pages/Login";
import Signup         from "./pages/Signup";
import OtpVerify      from "./pages/OtpVerify";
import ForgotPassword from "./pages/ForgotPassword";
import AuthCallback   from "./pages/AuthCallback";
import PaymentSuccess from "./pages/PaymentSuccess";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen transition-colors duration-300">
          <Navbar />

          <main className="flex-grow pt-20">
            <Routes>
              <Route path="/"                element={<Home />} />
              <Route path="/store"           element={<Store />} />
              <Route path="/livestream"      element={<Livestream />} />
              <Route path="/about"           element={<About />} />
              <Route path="/contact"         element={<Contact />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/signup"          element={<Signup />} />
              <Route path="/verify-email"    element={<OtpVerify />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/callback"   element={<AuthCallback />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment-success"   element={<PaymentSuccess />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;