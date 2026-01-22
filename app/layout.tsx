import type { Metadata } from "next";
import { Inconsolata } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

const Particles = dynamic(() => import("@/components/ui/Particles"), {
  ssr: false,
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarbonTrack - AI Carbon Footprint Calculator",
  description: "Track and reduce your carbon footprint with AI-powered bill scanning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inconsolata.variable} font-mono antialiased bg-background min-h-screen`}
        style={{ fontFamily: 'var(--font-inconsolata)' }}
      >
        <div className="fixed top-0 left-0 w-screen h-screen z-0 overflow-hidden">
          <Particles
            className="w-full h-full"
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleColors={['#ffffff', '#ffffff', '#ffffff']}
            moveParticlesOnHover={true}
            particleHoverFactor={1}
            alphaParticles={true}
            particleBaseSize={100}
            sizeRandomness={1}
            cameraDistance={20}
            disableRotation={false}
          />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
