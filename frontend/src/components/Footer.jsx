import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const Footer = () => {
  return (
    <footer className="relative z-20 bg-transparent border-t border-white/10">

  <div className="px-6 py-16 mx-auto max-w-7xl lg:px-8">

    <div className="grid grid-cols-1 gap-16 md:grid-cols-3">

      {/* BRAND */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="F1 Air Network" className="h-10" />
          <span className="text-base tracking-widest uppercase font-f1">
            F1 AIR NETWORK
          </span>
        </div>

        <p className="max-w-sm text-sm leading-relaxed text-white/60">
          Premium motorsport streaming platform delivering live races,
          exclusive content, and next-generation viewing experiences.
        </p>
      </div>

      {/* EXPLORE */}
      <div>
        <h3 className="mb-6 text-sm tracking-widest text-white uppercase font-f1">
          Explore
        </h3>

        <ul className="space-y-3 text-sm text-white/60">
          <li><Link onClick={() => window.scrollTo(0, 0)} to="/" className="transition hover:text-white">Home</Link></li>
          <li><Link onClick={() => window.scrollTo(0, 0)} to="/livestream" className="transition hover:text-white">Livestream</Link></li>
          <li><Link onClick={() => window.scrollTo(0, 0)} to="/store" className="transition hover:text-white">Store</Link></li>
          <li><Link onClick={() => window.scrollTo(0, 0)} to="/about" className="transition hover:text-white">About</Link></li>
          <li><Link onClick={() => window.scrollTo(0, 0)} to="/contact" className="transition hover:text-white">Contact</Link></li>
        </ul>
      </div>

      {/* CONNECT */}
      <div>
        <h3 className="mb-6 text-sm tracking-widest text-white uppercase font-f1">
          Connect
        </h3>

        <ul className="space-y-3 text-sm text-white/60">
          <li><a href="https://www.instagram.com/f1air.insta/" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Instagram</a></li>
          <li><a href="https://discord.gg/MBpJNDznc3" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Discord</a></li>
          <li><a href="https://t.me/f1airnetwork" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Telegram</a></li>
        </ul>
      </div>

    </div>

    <div className="pt-6 mt-16 text-xs text-center border-t border-white/10 text-white/40">
      © {new Date().getFullYear()} F1 Air Network. All rights reserved.
    </div>

  </div>
</footer>
  );
};

export default Footer;