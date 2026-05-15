import HeroSection from "../components/home/HeroSection";
import LiveEvents from "../components/home/LiveEvents";
import TopSellerSection from "../components/home/TopSellerSection";
import OtherProducts from "../components/home/OtherProducts";
import homeBg from "../assets/home-bg.png";

const Home = () => {
  return (
    <main className="relative w-full overflow-x-hidden">
      {/* Global Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${homeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="fixed inset-0 bg-black/70 z-0" />

      {/* Content */}
      <div>
        <HeroSection />
        <LiveEvents />
        <TopSellerSection />
        <OtherProducts />
      </div>
    </main>
  );
};

export default Home;
