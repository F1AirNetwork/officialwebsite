import React from 'react'
import { useNavigate } from 'react-router-dom';
import homeBg from '../../assets/home-bg.png';

const HeroSection = () => {

  const navigate = useNavigate();
  return (
    <section className="relative min-h-screen bg-black overflow-hidden">

      {/* FIXED BACKGROUND IMAGE (NON-SCROLLABLE) */}
      <div
        className="
          fixed inset-0
          z-0
          bg-black
        "
        style={{
          backgroundImage: `url(${homeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* DARK OVERLAY (IMPORTANT FOR READABILITY) */}
      <div className="fixed inset-0 bg-black/70 z-10" />

      {/* CONTENT */}
      <div
        className="
          relative z-20
          max-w-7xl
          mx-auto
          px-4 sm:px-6 lg:px-8
          pt-24 sm:pt-28 lg:pt-36
        "
      >
        {/* LEFT-OFFSET CONTENT COLUMN */}
        <div className="w-full lg:w-[55%] ">

          <h1
            className="
                font-f1 uppercase
                text-[26px]
                sm:text-4xl
                md:text-5xl
                lg:text-6xl
                xl:text-7xl
                leading-[1.1]
                tracking-normal sm:tracking-widest
                mb-6
              "
          >
            Ultimate
            Motorsports
            Streaming
          </h1>

          <p className="font-f1_n text-sm sm:text-base lg:text-lg text-white/80 mb-10 leading-relaxed">
            F1 Air Network delivers premium live streaming of Formula 1,
            MotoGP, WEC, and other motorsports. Plus exclusive digital
            products, subscriptions, and on-demand content.
          </p>

          <div className="flex gap-4 flex-wrap">

            {/* PRIMARY BUTTON */}
            <button
              onClick={() => {
                navigate('/livestream');
                scrollTo(0, 0);
              }}
              className="
      relative
      font-f1
      px-6 py-3 md:px-8 md:py-4
      uppercase tracking-widest
      border border-white/30
      text-white
      bg-transparent
      transition-all duration-300
      hover:border-white
    "
            >
              Watch Live Now
            </button>

            {/* SECONDARY BUTTON */}
            <button
              onClick={() => {
                navigate('/store');
                scrollTo(0, 0);
              }}
              className="
      relative
      font-f1
      px-6 py-3 md:px-8 md:py-4
      uppercase tracking-widest
      border border-white/30
      text-white
      bg-transparent
      transition-all duration-300
      hover:border-white
    "
            >
              Visit Store
            </button>

          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
