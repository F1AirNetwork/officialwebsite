import homeBg from "../assets/home-bg.png";

const About = () => {
  return (
    <main className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${homeBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 z-10" />

      <div className="relative z-20">

        {/* HERO */}
        <section className="pt-32 pb-24 text-center">
          <div className="max-w-4xl mx-auto px-6">

            <h1 className="font-f1 uppercase tracking-widest text-4xl md:text-5xl mb-6">
              About F1 Air Network
            </h1>

            <p className="text-white/70 text-lg leading-relaxed">
              We are redefining how motorsport fans experience racing —
              delivering premium live streams, real-time data, and
              immersive digital access.
            </p>

          </div>
        </section>

        {/* MISSION */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6 lg:px-8 text-center">

            <h2 className="font-f1 uppercase tracking-widest text-2xl mb-8">
              Our Mission
            </h2>

            <p className="text-white/60 max-w-3xl mx-auto leading-relaxed">
              F1 Air is a growing community that gives a safe space for new joiners as well as experienced viewers of various fields. Not limited to anything, we take interest in all sorts of activities promoting learning and healthy interactions worldwide. Our team works hard to provide with all the services, products & fulfill custom requests. The costs of our services & products are aimed to be 50% or less than the market price and at times given free if we don't have to invest heavily to provide it.
            </p>

          </div>
        </section>

        {/* WHY DIFFERENT */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">

            <div className="text-center mb-16">
              <h2 className="font-f1 uppercase tracking-widest text-2xl">
                What Sets Us Apart
              </h2>
              <div className="w-16 h-px bg-white/30 mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

              <div className="bg-white/5 border border-white/10 p-8 hover:border-white/30 transition duration-300">
                <h3 className="font-f1 uppercase mb-4">
                  Ultra Low Latency
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Experience live racing with minimal delay and
                  uninterrupted performance.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 hover:border-white/30 transition duration-300">
                <h3 className="font-f1 uppercase mb-4">
                  Multi-Angle Streams
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Switch between onboard cameras, pit lane views,
                  and exclusive race perspectives.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 hover:border-white/30 transition duration-300">
                <h3 className="font-f1 uppercase mb-4">
                  Advanced Telemetry
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Access real-time driver stats, tire data, and
                  race analytics built for true racing fans.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* VISION */}
        <section className="py-28 text-center">
          <div className="max-w-4xl mx-auto px-6">

            <h2 className="font-f1 uppercase tracking-widest text-2xl mb-6">
              Our Vision
            </h2>

            <p className="text-white/60 leading-relaxed">
              To become the most immersive digital motorsport platform
              in the world - combining technology, performance,
              and passion into one seamless experience.
            </p>

          </div>
        </section>

      </div>
    </main>
  );
};

export default About;
