'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'top', label: 'Top' },
  { id: 'problem', label: 'Why it’s hard' },
  { id: 'product', label: 'Five layers' },
  { id: 'engine', label: 'The recap' },
  { id: 'whatif', label: 'Scenarios' },
  { id: 'faq', label: 'Questions' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('top');
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    if (pathname !== '/') return;

    const handleScroll = () => {
      const sections = NAV_ITEMS.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 50,
        behavior: 'smooth'
      });
    }
  };

  // Scroll-spy nav belongs to the landing page only, not the app routes.
  if (pathname !== '/') return null;

  return (
    <nav 
      className={`fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex flex-col py-[60px] pr-6 pl-10 bg-transparent transition-all duration-300 mix-blend-difference`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ul className="flex flex-col gap-5 items-end">
        {NAV_ITEMS.map((item, idx) => {
          const isActive = activeSection === item.id;
          const showText = isHovered || isActive;
          
          let translateClass = 'translate-x-0';
          if (isHovered) {
             if (idx === 1 || idx === 4) translateClass = '-translate-x-[10px]';
             if (idx === 2 || idx === 3) translateClass = '-translate-x-[20px]';
          }
          
          return (
            <li key={item.id} className={`transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${translateClass}`}>
              <button
                className={`ui bg-transparent border-none text-white text-[13px] px-2 py-1 text-right flex items-center justify-end transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isActive ? 'opacity-100 font-bold scale-110' : 'opacity-50 hover:opacity-100 font-medium'}`}
                onClick={() => scrollToSection(item.id)}
                aria-label={item.label}
              >
              <div className="relative flex items-center justify-end min-h-[20px]">
                <AnimatePresence mode="wait">
                  {showText ? (
                    <motion.span
                      key="text"
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="whitespace-nowrap drop-shadow-md"
                    >
                      {item.label}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="underscore"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="font-bold drop-shadow-md"
                    >
                      _
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
