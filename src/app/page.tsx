'use client'; // This is a client component

import React, { useEffect } from 'react'; // Import React and the useEffect hook
import Link from 'next/link'; // Import the Link component from Next.js
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import the useRouter hook from Next.js
import { useAuth } from '@/hooks/use-auth'; // Import the useAuth hook from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'; // Import the Button component from '@/components/ui/button'
import {
  Music,
  Brain,
  BookOpen,
  ArrowRight,
  Heart,
} from 'lucide-react'; // Import icons from lucide-react
import { MotionDiv } from '@/components/motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { TermsOfServiceDialog } from '@/components/shared/TermsOfServiceDialog';

// Home component
export default function Home() {
  // Use the useAuth hook to get the user object
  const { user } = useAuth();
  // Use the useRouter hook to get the router object
  const router = useRouter();
  const featuresAnimation = useScrollAnimation();
  const aboutUsAnimation = useScrollAnimation();
  const howItWorksAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();
  const ctaAnimation = useScrollAnimation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    // If the user is authenticated, redirect to the dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]); // Only run this effect when the user or router changes

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.2 }
    }
  };
  
  const cardItemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  // Render the component
  return (
    <div className="min-h-screen bg-[#e55283] text-white">
      <style jsx global>{`
        body {
          background-color: #e55283;
          background-image: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 50%),
                            radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.1), transparent 50%);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease-in-out;
        }
        .glass-card:hover {
          border-color: #ffd600;
          box-shadow: 0 0 25px rgba(255, 214, 0, 0.4);
        }
        .grainy::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXVpaWlraeC+v7/s7+za2mem5vt7e3Q0NDg4ODe3t7T09Pe3t7W1tbPz8/V1dXb29vKysrOzs7Y2Njx8fLHy8vJysq6urq5ubq3t7e4uLqfn5+3t7fT09MAAAAMQeopAAAAJ3RSTlMABAj00gED2/769f3z7vj1/PM8JgIe8O2N8c6I84t1f31iX15WLBcWfgAAAaFJREFUSMe1loeeuCAQRO8R3KaAhf3/v20sHW9R0EZn+nZ3t5spdZ6gBAIZAGCRxgMhNEPEJ2yBZsI9EgwV4F14lABm8sM22s403A7pZf3o9YAZH+yWnOsi+YDRnJzZoGgY2O5Ysc3eG3YyN2EaB+4S30sP9wH6/A/gD98AaPjO4w0eM3gDcyBv2s9gWgfgGa8e8KAyFwW4rY/a+A9gH/f8F4hRwb35a0qAAAAAElFTkSuQmCC');
          opacity: 0.05;
          pointer-events: none;
          z-index: -1;
        }
        .text-shadow {
          text-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
        }
        .text-shadow-lg {
          text-shadow: 0px 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <div className="grainy" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#e55283]/70 to-transparent">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center">
              <Link href="/">
                 <Image src="/Loujo_Black.png" alt="Loujo Logo" width={140} height={35} />
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-10">
              <Link href="#features" className="text-white hover:text-yellow-300 font-medium text-lg transition-colors text-shadow">
                Features
              </Link>
              <Link href="#how-it-works" className="text-white hover:text-yellow-300 font-medium text-lg transition-colors text-shadow">
                How It Works
              </Link>
              <Link href="#testimonials" className="text-white hover:text-yellow-300 font-medium text-lg transition-colors text-shadow">
                Testimonials
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-lg text-white hover:text-yellow-300 hover:bg-white/10 text-shadow">Login</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-yellow-300 text-gray-800 hover:bg-yellow-400 text-lg px-6 py-3 rounded-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-96 pb-80 text-center overflow-hidden isolate">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover -z-10"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute top-0 left-0 w-full h-full bg-[#e55283]/50 -z-10" />

        <div className="relative z-10 container mx-auto px-6 lg:px-8">
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-shadow-lg">
              Learning Through the <span className="text-yellow-300">Power of Music</span>
            </h1>
          </MotionDiv>
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <p className="text-xl md:text-2xl text-pink-100 max-w-3xl mx-auto mb-10 text-shadow-lg">
              AI-generated educational songs designed specifically for dyslexic children,
              aligned with the UK National Curriculum.
            </p>
          </MotionDiv>
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}>
            <Link href="/register">
              <Button size="lg" className="bg-white text-[#e55283] hover:bg-gray-100 text-xl px-10 py-7 rounded-full shadow-lg transform hover:scale-105 transition-transform">
                Get Started Free
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
          </MotionDiv>
        </div>
      </section>

      {/* Features Section */}
      <MotionDiv 
        ref={featuresAnimation.ref}
        initial="hidden"
        animate={featuresAnimation.animation.animate ? "visible" : "hidden"}
        variants={cardContainerVariants}
        className="py-24 bg-white" 
        id="features"
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#e55283]">Why Choose Loujo?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              An innovative and joyful learning experience tailored for children with dyslexia.
            </p>
          </div>
          <MotionDiv 
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
            variants={cardContainerVariants}
          >
            <MotionDiv className="bg-white/80 backdrop-blur-sm border border-gray-200 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow" variants={cardItemVariants}>
              <div className="bg-[#e55283]/20 rounded-full p-4 inline-block mb-5">
                <Brain className="h-10 w-10 text-[#e55283]" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-[#e55283]">Personalized Learning</h3>
              <p className="text-gray-600 text-lg">
                AI-generated songs tailored to each student&apos;s unique learning needs and personal interests.
              </p>
            </MotionDiv>
            <MotionDiv className="bg-white/80 backdrop-blur-sm border border-gray-200 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow" variants={cardItemVariants}>
              <div className="bg-[#e55283]/20 rounded-full p-4 inline-block mb-5">
                <Music className="h-10 w-10 text-[#e55283]" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-[#e55283]">Music-Based Education</h3>
              <p className="text-gray-600 text-lg">
                Learn through catchy, memorable songs that make educational content fun and engaging.
              </p>
            </MotionDiv>
            <MotionDiv className="bg-white/80 backdrop-blur-sm border border-gray-200 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow" variants={cardItemVariants}>
              <div className="bg-[#e55283]/20 rounded-full p-4 inline-block mb-5">
                <BookOpen className="h-10 w-10 text-[#e55283]" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-[#e55283]">Curriculum-Aligned</h3>
              <p className="text-gray-600 text-lg">
                All content is aligned with the UK National Curriculum, ensuring relevance to schoolwork.
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* How It Works Section */}
      <MotionDiv 
        ref={howItWorksAnimation.ref}
        initial="hidden"
        animate={howItWorksAnimation.animation.animate ? "visible" : "hidden"}
        variants={cardContainerVariants}
        className="py-24 bg-[#e55283]" 
        id="how-it-works"
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-yellow-300 text-shadow-lg">How It Works</h2>
            <p className="text-xl text-pink-100 max-w-2xl mx-auto text-shadow-lg">
              Just a few simple steps to unlock a new world of learning through music.
            </p>
          </div>
          <div className="relative">
            <MotionDiv 
              className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/20"
              style={{ originX: 0, y: '-50%' }}
              initial={{ scaleX: 0 }}
              animate={howItWorksAnimation.animation.animate ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.5, ease: 'circOut' }}
            />
            <MotionDiv 
              className="grid grid-cols-1 md:grid-cols-4 gap-12 relative"
              variants={cardContainerVariants}
            >
              <MotionDiv className="text-center" variants={cardItemVariants}>
                <div className="bg-white/10 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-white/30 hover:border-yellow-300 hover:shadow-yellow-300/50 transition-all duration-300">
                  <span className="text-yellow-300 font-bold text-4xl text-shadow-lg">1</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white text-shadow">Create Account</h3>
                <p className="text-pink-100 text-lg text-shadow-lg">
                  Sign up as a student, teacher, or parent.
                </p>
              </MotionDiv>
              <MotionDiv className="text-center" variants={cardItemVariants}>
                <div className="bg-white/10 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-white/30 hover:border-yellow-300 hover:shadow-yellow-300/50 transition-all duration-300">
                  <span className="text-yellow-300 font-bold text-4xl text-shadow-lg">2</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white text-shadow">Generate Songs</h3>
                <p className="text-pink-100 text-lg text-shadow-lg">
                  Describe the educational content you want to learn.
                </p>
              </MotionDiv>
              <MotionDiv className="text-center" variants={cardItemVariants}>
                <div className="bg-white/10 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-white/30 hover:border-yellow-300 hover:shadow-yellow-300/50 transition-all duration-300">
                  <span className="text-yellow-300 font-bold text-4xl text-shadow-lg">3</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white text-shadow">Listen & Learn</h3>
                <p className="text-pink-100 text-lg text-shadow-lg">
                  Enjoy custom songs that make learning engaging.
                </p>
              </MotionDiv>
              <MotionDiv className="text-center" variants={cardItemVariants}>
                <div className="bg-white/10 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-white/30 hover:border-yellow-300 hover:shadow-yellow-300/50 transition-all duration-300">
                  <span className="text-yellow-300 font-bold text-4xl text-shadow-lg">4</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-white text-shadow">Track Progress</h3>
                <p className="text-pink-100 text-lg text-shadow-lg">
                  Earn badges and see your learning journey unfold.
                </p>
              </MotionDiv>
            </MotionDiv>
          </div>
        </div>
      </MotionDiv>

      {/* About Us Section */}
      <MotionDiv
        ref={aboutUsAnimation.ref}
        initial="hidden"
        animate={aboutUsAnimation.animation.animate ? "visible" : "hidden"}
        className="py-24 bg-white"
        id="about-us"
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <MotionDiv variants={cardItemVariants}>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#e55283]">About Us</h2>
            </MotionDiv>
          </div>
          <MotionDiv className="bg-white/80 backdrop-blur-sm border border-gray-200 p-8 md:p-12 rounded-2xl shadow-lg" variants={cardContainerVariants}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <MotionDiv variants={cardItemVariants}>
                <h3 className="text-2xl font-semibold mb-4 text-[#e55283]">Our Founder&apos;s Story</h3>
                <p className="text-gray-600 text-lg">
                  Alex (the founder) was diagnosed with dyslexia while studying neuroscience at Cardiff University. What helped him get through was music and catchy songs. He understands the struggles of traditional education. Fast forward twenty years, his niece was showing signs of dyslexia. Traditional methods based around reading and writing are failing dyslexic kids.
                </p>
              </MotionDiv>
              <MotionDiv variants={cardItemVariants}>
                <h3 className="text-2xl font-semibold mb-4 text-[#e55283]">Our Team & Advisors</h3>
                <p className="text-gray-600 text-lg">
                  Fabricio Freitag and Chainacademy built the MVP (demo) platform. Steve Casquero designed the logo and brand. Rebecca Blasco and Dr Bhogal&apos;s advice and educational expertise has been great and essential for making sure our platform is built for dyslexic children. We are blessed to have three experienced advisors helping develop our startup. Aidan Cartwright, Michael Barry and Taylor Williams have been great for advice and development.
                </p>
              </MotionDiv>
            </div>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* Testimonials Section */}
      <MotionDiv 
        ref={testimonialsAnimation.ref}
        initial="hidden"
        animate={testimonialsAnimation.animation.animate ? "visible" : "hidden"}
        className="py-24 bg-[#e55283]" 
        id="testimonials"
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-yellow-300 text-shadow-lg">Loved by Families and Educators</h2>
            <p className="text-xl text-pink-100 max-w-2xl mx-auto text-shadow-lg">
              Hear from the teachers, parents, and students who are experiencing the magic of Loujo.
            </p>
          </div>
          <MotionDiv 
            className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            variants={cardContainerVariants}
          >
            <MotionDiv className="glass-card p-8 rounded-2xl transform hover:-translate-y-2 transition-transform shadow-lg" variants={cardItemVariants}>
               <div className="flex items-center mb-5">
                <div className="h-16 w-16 rounded-full bg-yellow-300 text-[#e55283] flex items-center justify-center font-bold text-3xl mr-5">
                  S
                </div>
                <div>
                  <h3 className="font-semibold text-2xl text-white text-shadow">Sarah J.</h3>
                  <p className="text-lg text-pink-100 text-shadow-lg">Teacher</p>
                </div>
              </div>
              <p className="text-white text-lg text-shadow-lg">
                &ldquo;Loujo has transformed how my dyslexic students engage with learning. The songs make complex concepts stick, and I&apos;ve seen their confidence soar!&rdquo;
              </p>
            </MotionDiv>
            <MotionDiv className="glass-card p-8 rounded-2xl transform hover:-translate-y-2 transition-transform shadow-lg" variants={cardItemVariants}>
              <div className="flex items-center mb-5">
                <div className="h-16 w-16 rounded-full bg-yellow-300 text-[#e55283] flex items-center justify-center font-bold text-3xl mr-5">
                  M
                </div>
                <div>
                  <h3 className="font-semibold text-2xl text-white text-shadow">Michael B.</h3>
                  <p className="text-lg text-pink-100 text-shadow-lg">Parent</p>
                </div>
              </div>
              <p className="text-white text-lg text-shadow-lg">
                &ldquo;My daughter struggled with reading, but now she sings about historical events and scientific facts. It&apos;s amazing to see her so excited about learning.&rdquo;
              </p>
            </MotionDiv>
            <MotionDiv className="glass-card p-8 rounded-2xl transform hover:-translate-y-2 transition-transform shadow-lg" variants={cardItemVariants}>
              <div className="flex items-center mb-5">
                <div className="h-16 w-16 rounded-full bg-yellow-300 text-[#e55283] flex items-center justify-center font-bold text-3xl mr-5">
                  J
                </div>
                <div>
                  <h3 className="font-semibold text-2xl text-white text-shadow">Jamie</h3>
                  <p className="text-lg text-pink-100 text-shadow-lg">Student, Age 10</p>
                </div>
              </div>
              <p className="text-white text-lg text-shadow-lg">
                &ldquo;I love making songs about what I&apos;m learning! It&apos;s way more fun than just reading a book. My friends and I even make up dances to the songs.&rdquo;
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </MotionDiv>

      {/* CTA Section */}
      <MotionDiv 
        ref={ctaAnimation.ref}
        initial={ctaAnimation.animation.initial}
        animate={ctaAnimation.animation.animate}
        transition={ctaAnimation.animation.transition}
        className="py-24 bg-white"
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-800 p-12 md:p-16 rounded-3xl shadow-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#e55283]">Ready to Transform Learning?</h2>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-10 text-gray-600">
              Join thousands of students, teachers, and parents using Loujo to make education musical, memorable, and fun.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-yellow-300 text-gray-800 hover:bg-yellow-400 text-xl px-10 py-7 rounded-full shadow-lg transform hover:scale-105 transition-transform">
                Create Your Free Account
                <Heart className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required. Start for free today!
            </p>
          </div>
        </div>
      </MotionDiv>

      {/* Footer */}
      <footer className="bg-gray-900 py-16">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center mb-4">
                   <Image src="/Loujo_Black.png" alt="Loujo Logo" width={140} height={35} />
              </div>
              <p className="text-pink-100 mt-4 text-shadow-lg">
                AI-powered educational music platform for dyslexic children.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-yellow-300 text-shadow">Quick Links</h3>
              <ul className="space-y-3">
                <li><Link href="#features" className="text-pink-100 hover:text-white text-shadow">Features</Link></li>
                <li><Link href="#how-it-works" className="text-pink-100 hover:text-white text-shadow">How It Works</Link></li>
                <li><Link href="#testimonials" className="text-pink-100 hover:text-white text-shadow">Testimonials</Link></li>
                <li><Link href="/contact" className="text-pink-100 hover:text-white text-shadow">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-yellow-300 text-shadow">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <TermsOfServiceDialog
                    trigger={
                      <button className="text-pink-100 hover:text-white text-shadow transition-colors">
                        Terms & Policies
                      </button>
                    }
                  />
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-yellow-300 text-shadow">Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="https://x.com/Octamaestra2024" target="_blank" rel="noopener noreferrer" className="text-pink-100 hover:text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.28C8.28,9.09 5.11,7.38 2.9,4.79C2.53,5.42 2.33,6.16 2.33,6.94C2.33,8.43 3.08,9.75 4.18,10.53C3.47,10.51 2.82,10.31 2.22,10.03V10.08C2.22,12.21 3.73,14 5.86,14.45C5.5,14.54 5.12,14.58 4.71,14.58C4.42,14.58 4.14,14.55 3.87,14.5C4.4,16.26 6.02,17.53 7.9,17.57C6.41,18.73 4.53,19.46 2.5,19.46C2.17,19.46 1.85,19.44 1.54,19.4C3.44,20.69 5.7,21.5 8.12,21.5C16,21.5 20.33,14.97 20.33,9.23C20.33,9.03 20.33,8.84 20.32,8.64C21.16,8.05 21.88,7.32 22.46,6Z" /></svg>
                </a>
                <a href="https://www.facebook.com/groups/480856098108737" target="_blank" rel="noopener noreferrer" className="text-pink-100 hover:text-white">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-12 pt-8 text-center text-pink-100">
            <p className="text-shadow-lg">&copy; {new Date().getFullYear()} Loujo. All rights reserved.</p>
            <p className="text-xs mt-4 text-shadow-lg">
              <a 
                href="https://www.pexels.com/video/child-and-adult-hands-on-toy-piano-10565783/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-white transition-colors"
              >
                Video by RDNE Stock project
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
