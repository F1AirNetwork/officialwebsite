import homeBg from "../assets/home-bg.png";
import { Instagram, Send, MessageCircle } from "lucide-react";

const Contact = () => {
  const socials = [
    {
      name: "Instagram",
      handle: "@f1air.insta",
      link: "https://www.instagram.com/f1air.insta/",
      icon: <Instagram size={28} />,
    },
    {
      name: "Discord",
      handle: "Join Our Server",
      link: "https://discord.gg/MBpJNDznc3",
      icon: <MessageCircle size={28} />,
    },
    {
      name: "Telegram",
      handle: "@f1airnetwork",
      link: "https://t.me/f1airnetwork",
      icon: <Send size={28} />,
    },
  ];

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
      <div className="fixed inset-0 bg-black/85 z-10" />

      <div className="relative z-20">

        {/* HERO */}
        <section className="pt-32 pb-20 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="font-f1 uppercase tracking-widest text-4xl md:text-5xl mb-6">
              Get In Touch
            </h1>

            <p className="text-white/70 text-lg leading-relaxed">
              Connect with us through our official social channels.
              Stay updated and join the F1 Air Network community.
            </p>
          </div>
        </section>

        {/* SOCIAL CARDS */}
        <section className="pb-32">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

              {socials.map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    group
                    bg-white/5
                    border border-white/10
                    p-10
                    text-center
                    transition duration-300
                    hover:border-white/40
                    hover:-translate-y-1
                  "
                >
                  <div className="flex justify-center mb-6 text-white/80 group-hover:text-white transition">
                    {social.icon}
                  </div>

                  <h2 className="font-f1 uppercase tracking-widest mb-3 text-lg">
                    {social.name}
                  </h2>

                  <p className="text-white/60 text-sm group-hover:text-white transition">
                    {social.handle}
                  </p>
                </a>
              ))}

            </div>

          </div>
        </section>

      </div>
    </main>
  );
};

export default Contact;
