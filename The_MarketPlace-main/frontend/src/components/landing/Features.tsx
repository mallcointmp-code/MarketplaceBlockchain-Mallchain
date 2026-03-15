import {
  Store,
  ShoppingBag,
  Truck,
  PenTool,
} from "lucide-react";

type Feature = {
  id: string;
  title: string;
  description: string;
  Icon: React.ElementType;
  accent: string;
};

const FEATURES: Feature[] = [
  {
    id: "buyer",
    title: "Buyer",
    description:
      "Browse verified products, pay securely with MallCoin, and earn MallPoints on every purchase.",
    Icon: ShoppingBag,
    accent: "from-blue-500 to-cyan-400",
  },
  {
    id: "seller",
    title: "Seller",
    description:
      "Launch your store, manage products, and receive payments globally using MallCoin.",
    Icon: Store,
    accent: "from-yellow-400 to-orange-500",
  },
  {
    id: "delivery",
    title: "Delivery",
    description:
      "Complete deliveries in your area, track performance, and get paid instantly.",
    Icon: Truck,
    accent: "from-emerald-500 to-green-400",
  },
  {
    id: "creator",
    title: "Creator",
    description:
      "Work on digital tasks, earn MallPoints, and convert rewards into value.",
    Icon: PenTool,
    accent: "from-purple-500 to-pink-500",
  },
];

export default function Features() {
  return (
    <section className="relative w-full bg-neutral-950 overflow-hidden">
      {/* subtle grid background */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(transparent_1px,#fff_1px),linear-gradient(90deg,transparent_1px,#fff_1px)] bg-[size:60px_60px]" />

      <div className="relative max-w-7xl mx-auto px-6 py-28">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            One platform for a{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-primary bg-clip-text text-transparent">
              digital economy
            </span>
          </h2>

          <p className="mt-6 text-lg text-neutral-400">
            Buy, sell, deliver, or create — all powered by MallCoin and MallPoints.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map(({ id, title, description, Icon, accent }) => (
            <div
              key={id}
              className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              {/* Icon */}
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${accent}`}
              >
                <Icon className="text-white" size={26} />
              </div>

              {/* Content */}
              <h3 className="mt-6 text-xl font-semibold text-white">
                {title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
