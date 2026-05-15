// src/pages/Home.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StaticArtistGraph from "../components/StaticArtistGraph";
import "../App.css";

// Componente de la Landing Page
function Home() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Animaciones al hacer scroll
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('.about-section, .benefits-section, .disclaimer-section');
    sections.forEach(section => observer.observe(section));

    const cards = document.querySelectorAll('.topic-card, .developer-card, .benefit-card');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
      
      const sections = ['inicio', 'acerca', 'beneficios', 'disclaimer'];
      const scrollPosition = window.scrollY + 100;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }

      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const offsetTop = section.offsetTop;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
      setActiveSection(sectionId);
      closeMenu();
    }
  };

  const goToAuth = () => {
    navigate('/auth');
    closeMenu();
  };

  return (
    <div className="App">
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <div className="logo">
            <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
          </div>

          <ul className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <li>
              <button 
                className={activeSection === 'inicio' ? 'active' : ''}
                onClick={() => scrollToSection('inicio')}
              >
                Inicio
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'acerca' ? 'active' : ''}
                onClick={() => scrollToSection('acerca')}
              >
                Acerca del Proyecto
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'beneficios' ? 'active' : ''}
                onClick={() => scrollToSection('beneficios')}
              >
                Beneficios
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'disclaimer' ? 'active' : ''}
                onClick={() => scrollToSection('disclaimer')}
              >
                Proyecto Académico
              </button>
            </li>
            <li>
              <a 
                href="#auth"
                className="btn-musica"
                onClick={(e) => {
                  e.preventDefault();
                  goToAuth();
                }}
              >
                Escuchar Música
              </a>
            </li>
          </ul>

          <button 
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="inicio" className="hero">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">ShafaFy</span>
            <span className="title-subtitle">Tu reproductor Chafa</span>
          </h1>
          
          <p className="hero-description">
            Un reproductor virtual inspirado en Spotify, desarrollado con fines académicos. 
            Implementa estructuras de datos avanzadas como pilas, árboles, tries y grafos 
            para ofrecerte una experiencia única de navegación, búsqueda y recomendaciones.
          </p>
          
          <button className="btn-hero" onClick={goToAuth}>
            Escucha Ahora
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="scroll-indicator">
          <span>Scroll</span>
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* SECCIÓN: ACERCA DEL PROYECTO */}
      <section id="acerca" className="about-section">
        <div className="container">
          
          <div className="about-intro">
            <div className="about-text">
              <h2 className="section-title">
                <span className="title-accent">Acerca de</span> ShafaFy
              </h2>
              <p className="about-description">
                ShafaFy es un reproductor de música virtual desarrollado como proyecto académico 
                para la Universidad Autónoma de Occidente. Este proyecto implementa conceptos avanzados de 
                estructuras de datos y algoritmos para crear una experiencia de usuario fluida 
                y eficiente.
              </p>
              <p className="about-description">
                A través de ShafaFy, exploramos cómo las estructuras de datos fundamentales 
                pueden aplicarse en aplicaciones web modernas, desde la gestión de listas de 
                reproducción hasta sistemas de recomendación inteligentes.
              </p>
              <p className="about-description">
                La integración con la <strong>API de Spotify</strong> nos permite acceder a información 
                detallada de canciones, álbumes y artistas, incluyendo sus imágenes y metadatos. Sin embargo, 
                Spotify no permite la reproducción directa de canciones a través de su API en proyectos 
                de este tipo, por lo que integramos la <strong>YouTube Data API</strong> como motor de 
                reproducción. Esta combinación nos da lo mejor de ambas plataformas: la riqueza de datos 
                de Spotify y la capacidad de reproducción de YouTube.
              </p>
              <p className="about-description">
                Es importante tener en cuenta que, debido a restricciones de <strong>derechos de autor</strong>, 
                no todas las canciones están disponibles para reproducción en YouTube. Algunas pistas pueden 
                no aparecer o estar bloqueadas según la región, lo cual es una limitación inherente a las 
                políticas de las plataformas y está fuera del control de la aplicación.
              </p>
            </div>
            <div className="about-image">
              <div className="image-wrapper">
                <img src="../logo shafaty.png" alt="ShafaFy Logo" />
                <div className="image-glow"></div>
              </div>
            </div>
          </div>

          <div className="topics-section">
            <h3 className="subsection-title">Estructuras de Datos Implementadas</h3>
            <p className="subsection-description">
              Este proyecto universitario integra diversos conceptos de estructuras de datos 
              para crear una aplicación funcional y educativa.
            </p>
            
            <div className="topics-grid">
              <div className="topic-card">
                <div className="topic-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                    <path d="M2 17L12 22L22 17"/>
                    <path d="M2 12L12 17L22 12"/>
                  </svg>
                </div>
                <h4>JavaScript & React</h4>
                <p>Framework moderno para interfaces dinámicas y componentes reutilizables.</p>
              </div>

              <div className="topic-card">
                <div className="topic-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="4"/>
                    <rect x="3" y="10" width="18" height="4"/>
                    <rect x="3" y="17" width="18" height="4"/>
                  </svg>
                </div>
                <h4>Estructuras Lineales</h4>
                <p>Implementación de pilas y colas para gestión de historial y cola de reproducción.</p>
              </div>

              <div className="topic-card">
                <div className="topic-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="6" cy="15" r="2"/>
                    <circle cx="18" cy="15" r="2"/>
                    <line x1="12" y1="7" x2="6" y2="13"/>
                    <line x1="12" y1="7" x2="18" y2="13"/>
                  </svg>
                </div>
                <h4>Árboles</h4>
                <p>Árboles — Foro de publicaciones y comentarios anidados</p>
              </div>

              <div className="topic-card">
                <div className="topic-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <h4>Hash Tables & Tries</h4>
                <p>Búsqueda ultrarrápida de canciones y autocompletado inteligente.</p>
              </div>

              <div className="topic-card">
                <div className="topic-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="5" r="2"/>
                    <circle cx="19" cy="5" r="2"/>
                    <circle cx="5" cy="19" r="2"/>
                    <circle cx="19" cy="19" r="2"/>
                    <line x1="7" y1="5" x2="17" y2="5"/>
                    <line x1="5" y1="7" x2="5" y2="17"/>
                    <line x1="7" y1="19" x2="17" y2="19"/>
                    <line x1="19" y1="7" x2="19" y2="17"/>
                  </svg>
                </div>
                <h4>Grafos</h4>
                <p>Sistema de recomendaciones basado en relaciones entre canciones y usuarios.</p>
              </div>
            </div>
          </div>

          <div className="developers-section">
            <h3 className="subsection-title">Nuestro Equipo</h3>
            <p className="subsection-description">
              Estudiantes de Ingeniería de Sistemas apasionados por la tecnología y la música.
            </p>
            
            <div className="developers-grid">
              <div className="developer-card">
                <div className="developer-avatar">
                  <div className="avatar-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
                <h4>Andre Rodriguez</h4>
                <span className="developer-role">Full Stack Developer</span>
                <p className="developer-description">
                  Especializado en el desarrollo del backend y la implementación de estructuras 
                  de datos. Responsable de la arquitectura del servidor y la base de datos.
                </p>
              </div>

              <div className="developer-card">
                <div className="developer-avatar">
                  <div className="avatar-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
                <h4>Julian Viafara</h4>
                <span className="developer-role">Frontend Developer & UI/UX</span>
                <p className="developer-description">
                  Enfocado en la experiencia de usuario y el diseño de interfaces. Responsable 
                  de la implementación del frontend y las animaciones interactivas.
                </p>
              </div>
            </div>
          </div>

          <div className="tech-section">
            <h3 className="subsection-title">Stack Tecnológico</h3>
            
            <div className="tech-category">
              <h4 className="tech-category-title">Backend</h4>
              <div className="tech-logos">
                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1.85c-.27 0-.55.07-.78.2l-7.44 4.3c-.48.28-.78.8-.78 1.36v8.58c0 .56.3 1.08.78 1.36l1.95 1.12c.95.46 1.27.47 1.71.47 1.4 0 2.21-.85 2.21-2.33V8.44c0-.12-.1-.22-.22-.22H8.5c-.13 0-.23.1-.23.22v8.47c0 .66-.68 1.31-1.77.76L4.45 16.5a.26.26 0 0 1-.11-.21V7.71c0-.09.04-.17.11-.21l7.44-4.29c.06-.04.16-.04.22 0l7.44 4.29c.07.04.11.12.11.21v8.58c0 .08-.04.16-.11.21l-7.44 4.29c-.06.04-.16.04-.22 0L10.6 20c-.06-.03-.14-.03-.2 0-.53.3-.63.36-1.12.51-.12.04-.31.11.07.32l2.48 1.47c.24.14.5.21.78.21s.54-.07.78-.21l7.44-4.29c.48-.28.78-.8.78-1.36V7.71c0-.56-.3-1.08-.78-1.36l-7.44-4.3c-.23-.13-.51-.2-.78-.2z"/>
                    </svg>
                  </div>
                  <span>Node.js</span>
                </div>

                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 18.588a1.529 1.529 0 01-1.895-.72l-3.45-4.771-.5-.667-4.003 5.444a1.466 1.466 0 01-1.802.708l5.158-6.92-4.798-6.251a1.595 1.595 0 011.9.666l3.576 4.83 3.596-4.81a1.435 1.435 0 011.788-.668L21.708 7.9l-2.522 3.283a.666.666 0 000 .994l4.804 6.412zM.002 11.576l.42-2.075c1.154-4.103 5.858-5.81 9.094-3.27 1.895 1.489 2.368 3.597 2.275 5.973H1.116C.943 16.447 4.005 19.009 7.92 17.7a4.078 4.078 0 002.582-2.876c.207-.666.548-.78 1.174-.588a5.417 5.417 0 01-2.589 3.957 6.272 6.272 0 01-7.306-.933 6.575 6.575 0 01-1.64-3.858c0-.235-.08-.455-.134-.666A88.33 88.33 0 010 11.577zm1.127-.286h9.654c-.06-3.076-2.001-5.258-4.59-5.278-2.882-.04-4.944 2.094-5.071 5.264z"/>
                    </svg>
                  </div>
                  <span>Express</span>
                </div>

                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/>
                    </svg>
                  </div>
                  <span>MongoDB</span>
                </div>
              </div>
            </div>

            <div className="tech-category">
              <h4 className="tech-category-title">Frontend</h4>
              <div className="tech-logos">
                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>
                    </svg>
                  </div>
                  <span>React</span>
                </div>

                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
                    </svg>
                  </div>
                  <span>CSS3</span>
                </div>
              </div>
            </div>

            <div className="tech-category">
              <h4 className="tech-category-title">APIs Integradas</h4>
              <div className="tech-logos">
                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                  <span>Spotify API</span>
                </div>

                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                    </svg>
                  </div>
                  <span>YouTube Data API</span>
                </div>
              </div>
            </div>

            <div className="deployment-info">
              <h4 className="tech-category-title">Despliegue & Control de Versiones</h4>
              <div className="tech-logos">
                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                  </div>
                  <span>GitHub</span>
                </div>

                <div className="tech-item">
                  <div className="tech-logo">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.486 3.516L12 0 3.514 3.516 0 12l3.514 8.484L12 24l8.486-3.516L24 12l-3.514-8.484zM5.736 11.977V9.626l5.736-2.868v2.351l-3.385 1.693 3.385 1.692v2.352l-5.736-2.869zm5.736 0l5.735-2.868v2.351l-3.384 1.693 3.384 1.692v2.352l-5.735-2.869v-2.351z"/>
                    </svg>
                  </div>
                  <span>Railway</span>
                </div>
              </div>
              
              <div className="deployment-explanation">
                <div className="explanation-card">
                  <h5>Arquitectura de Despliegue en Railway</h5>
                  <p>
                    Hemos optado por desplegar tanto el frontend como el backend en Railway 
                    dentro de un mismo proyecto, simplificando la gestión y el ciclo de deployment:
                  </p>
                  <ul>
                    <li>
                      <strong>Backend en Railway:</strong> Aplicación Node.js con MongoDB desplegada 
                      directamente en Railway, con despliegues automáticos y manejo seguro de 
                      variables de entorno.
                    </li>
                    <li>
                      <strong>Frontend en Railway:</strong> La aplicación React se sirve desde el 
                      mismo proyecto en Railway, manteniendo todo el stack unificado en una 
                      sola plataforma.
                    </li>
                    <li>
                      <strong>Ventaja principal:</strong> Al centralizar todo en un mismo proyecto 
                      de Railway, simplificamos la configuración de red interna, las variables de 
                      entorno compartidas y el monitoreo, facilitando el mantenimiento y los 
                      despliegues del stack completo.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="repo-links">
                <a href="#" className="repo-link" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                  Ver Repositorio en GitHub
                </a>
                <a href="#" className="repo-link demo-link" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8"/>
                  </svg>
                  Ver Demo en Vivo
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN: BENEFICIOS */}
      <section id="beneficios" className="benefits-section">
        <div className="container">
          
          <div className="benefits-header">
            <h2 className="section-title-alt">
              ¿Por qué elegir <span className="highlight-gradient">ShafaFy</span>?
            </h2>
            <p className="benefits-intro">
              Descubre las ventajas de usar nuestro reproductor académico con tecnología avanzada
            </p>
          </div>

          <div className="benefit-card benefit-music">
            <div className="benefit-number">01</div>
            <div className="benefit-content">
              <div className="benefit-icon-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
              </div>
              <div className="benefit-text">
                <h3>Acceso Completo a Música</h3>
                <p>
                  Integración directa con la <strong>API de Spotify</strong> para acceder a millones 
                  de canciones. En caso de fallas, contamos con respaldo mediante la 
                  <strong> YouTube Data API</strong> para garantizar que siempre puedas 
                  disfrutar de música sin interrupciones.
                </p>
                <div className="benefit-badges">
                  <span className="badge">Spotify API</span>
                  <span className="badge">YouTube Data API</span>
                  <span className="badge">Streaming 24/7</span>
                </div>
              </div>
            </div>
            <div className="benefit-decoration music-waves">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
          </div>

          <div className="benefit-card benefit-analytics">
            <div className="benefit-number">02</div>
            <div className="benefit-content reverse">
              <div className="benefit-text">
                <h3>Conoce Tu Impacto Musical</h3>
                <p>
                  Visualiza tu actividad en la plataforma mediante <strong>grafos interactivos</strong>. 
                  Descubre tus canciones favoritas, artistas y grupos más escuchados, y 
                  realiza un seguimiento de tus canciones más frecuentes del mes. 
                  Nuestro sistema mapea tus hábitos musicales en tiempo real.
                </p>
                <div className="analytics-stats">
                  <div className="stat-item">
                    <div className="stat-icon">❤️</div>
                    <span>Canciones Favoritas</span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">🎤</div>
                    <span>Artistas y Grupos</span>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">🔥</div>
                    <span>Más Escuchadas del Mes</span>
                  </div>
                </div>
              </div>
              <div className="benefit-icon-large graph-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5" cy="5" r="3"/>
                  <circle cx="19" cy="5" r="3"/>
                  <circle cx="12" cy="19" r="3"/>
                  <line x1="6.5" y1="7" x2="10.5" y2="17"/>
                  <line x1="17.5" y1="7" x2="13.5" y2="17"/>
                  <line x1="7" y1="5" x2="17" y2="5"/>
                </svg>
              </div>
            </div>
            <div className="benefit-decoration graph-nodes">
              <div className="node"></div>
              <div className="node"></div>
              <div className="node"></div>
              <div className="node"></div>
            </div>
          </div>

          {/* ── BENEFIT CARD 03: usa StaticArtistGraph ── */}
          <div className="benefit-card benefit-generator">
            <div className="benefit-number">03</div>
            <div className="benefit-content">
              <div className="benefit-text full-width">
                <h3>Generador de Grafos Personalizado</h3>
                <p>
                  Crea visualizaciones únicas basadas en tus estadísticas. Genera grafos dinámicos 
                  que muestren tus canciones más reproducidas, artistas con mayor presencia 
                  y álbumes más escuchados. Una herramienta poderosa para entender tus patrones musicales.
                </p>
              </div>
            </div>

            <div className="graph-generator">
              <h4 className="generator-title">Selecciona el tipo de grafo a visualizar:</h4>
              <StaticArtistGraph />
            </div>
          </div>

        </div>
      </section>

      {/* SECCIÓN: DISCLAIMER ACADÉMICO */}
      <section id="disclaimer" className="disclaimer-section">
        <div className="container">
          
          <div className="disclaimer-content">
            <div className="disclaimer-text">
              <div className="disclaimer-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
                <span>Proyecto Académico</span>
              </div>

              <h2 className="disclaimer-title">
                Declaración de <span className="text-highlight">Fines Educativos</span>
              </h2>

              <div className="disclaimer-info">
                <p className="disclaimer-paragraph">
                  <strong>ShafaFy</strong> es un proyecto desarrollado exclusivamente con 
                  <strong> fines académicos y educativos</strong> como parte de la asignatura 
                  <strong> Estructura de Datos y Algoritmos 2</strong>, del Grupo 51, en la 
                  <strong> Universidad Autónoma de Occidente</strong>.
                </p>

                <p className="disclaimer-paragraph">
                  Este proyecto <strong>NO busca copiar, imitar o replicar</strong> la plataforma 
                  Spotify de manera comercial. Se trata de una herramienta educativa para demostrar 
                  la implementación práctica de estructuras de datos avanzadas en aplicaciones web modernas.
                </p>

                <div className="disclaimer-warning">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <strong>Aviso de Integridad Académica:</strong>
                    <p>
                      Cualquier copia, imitación o reproducción de este proyecto por parte de otros 
                      estudiantes de la asignatura será considerado <strong>plagio académico</strong> y 
                      será debidamente reportado al Comité de Ética de la Universidad Autónoma de Occidente. 
                      Este tipo de fraude académico está en contra de nuestros principios y será sancionado 
                      conforme al reglamento universitario.
                    </p>
                  </div>
                </div>

                <div className="academic-details">
                  <div className="detail-row">
                    <div className="detail-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
                      </svg>
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Universidad</span>
                      <span className="detail-value">Universidad Autónoma de Occidente</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
                      </svg>
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Asignatura</span>
                      <span className="detail-value">Estructura de Datos y Algoritmos 2 - Grupo 51</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                      </svg>
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Docente</span>
                      <span className="detail-value">Jonathan López Londoño</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4M19 20H5V10H19V20M19 8H5V6H19V8M12 13H17V18H12V13Z"/>
                      </svg>
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Periodo Académico</span>
                      <span className="detail-value">2026-1S</span>
                    </div>
                  </div>

                  <div className="detail-row">
                    <div className="detail-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 17V19H2V17S2 13 9 13 16 17 16 17M12.5 7.5A3.5 3.5 0 1 0 9 11A3.5 3.5 0 0 0 12.5 7.5M15.94 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13M15 4A3.39 3.39 0 0 0 13.07 4.59A5 5 0 0 1 13.07 10.41A3.39 3.39 0 0 0 15 11A3.5 3.5 0 0 0 15 4Z"/>
                      </svg>
                    </div>
                    <div className="detail-content">
                      <span className="detail-label">Desarrolladores</span>
                      <span className="detail-value">Andre Rodriguez & Julian Viafara</span>
                    </div>
                  </div>
                </div>

                <div className="disclaimer-footer">
                  <p>
                    Este proyecto no genera ni busca ninguna <strong>remuneración económica</strong>. 
                    Es una demostración puramente educativa de la aplicación de conceptos aprendidos 
                    en clase.
                  </p>
                </div>
              </div>
            </div>

            <div className="disclaimer-image">
              <div className="university-card">
                <div className="university-logo-wrapper">
                  <div className="university-logo-container">
                    <img src="/Logo_UAO.png" alt="Universidad Autónoma de Occidente" />
                  </div>
                  <h3 className="university-name">Universidad Autónoma de Occidente</h3>
                  <p className="university-motto">Transformación con conocimiento</p>
                </div>

                <div className="university-details">
                  <div className="university-stat">
                    <span className="stat-number">2026</span>
                    <span className="stat-label">Año del Proyecto</span>
                  </div>
                  <div className="university-stat">
                    <span className="stat-number">1S</span>
                    <span className="stat-label">Primer Semestre</span>
                  </div>
                </div>

                <div className="seal-decoration">
                  <div className="seal-ring"></div>
                  <div className="seal-ring"></div>
                  <div className="seal-ring"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-container">
          
          <div className="footer-top">
            
            <div className="footer-column footer-brand">
              <div className="footer-logo">
                <span className="logo-text">Shafa<span className="logo-accent">Fy</span></span>
              </div>
              <p className="footer-description">
                Un reproductor virtual académico que implementa estructuras de datos avanzadas 
                para crear una experiencia musical única y educativa.
              </p>
              <div className="footer-social">
                <a href="https://github.com" className="social-link" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </a>
                <a href="https://linkedin.com" className="social-link" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="https://twitter.com" className="social-link" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Navegación</h4>
              <ul className="footer-links">
                <li><a href="#inicio">Inicio</a></li>
                <li><a href="#acerca">Acerca del Proyecto</a></li>
                <li><a href="#beneficios">Beneficios</a></li>
                <li><a href="#disclaimer">Proyecto Académico</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Recursos</h4>
              <ul className="footer-links">
                <li><a href="#" target="_blank" rel="noopener noreferrer">Documentación</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">Repositorio GitHub</a></li>
                <li><a href="#" target="_blank" rel="noopener noreferrer">Demo en Vivo</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Información Académica</h4>
              <ul className="footer-links">
                <li><a href="#disclaimer">Proyecto Académico</a></li>
                <li><a href="https://www.uao.edu.co/" target="_blank" rel="noopener noreferrer">Universidad Autónoma de Occidente</a></li>
                <li><span className="footer-info">Estructura de Datos y Algoritmos 2</span></li>
                <li><span className="footer-info">Grupo 51 - 2026-1S</span></li>
              </ul>
            </div>

          </div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <div className="footer-bottom-left">
                <p className="footer-copyright">
                  © 2026 ShafaFy. Proyecto Académico - Sin fines comerciales.
                </p>
                <p className="footer-university">
                  Desarrollado por <strong>Andre Rodriguez</strong> y <strong>Julian Viafara</strong>
                </p>
              </div>

              <div className="footer-bottom-right">
                <div className="footer-tech-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>
                  </svg>
                  <span>Made with React</span>
                </div>
                <div className="footer-tech-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.85c-.27 0-.55.07-.78.2l-7.44 4.3c-.48.28-.78.8-.78 1.36v8.58c0 .56.3 1.08.78 1.36l1.95 1.12c.95.46 1.27.47 1.71.47 1.4 0 2.21-.85 2.21-2.33V8.44c0-.12-.1-.22-.22-.22H8.5c-.13 0-.23.1-.23.22v8.47c0 .66-.68 1.31-1.77.76L4.45 16.5a.26.26 0 0 1-.11-.21V7.71c0-.09.04-.17.11-.21l7.44-4.29c.06-.04.16-.04.22 0l7.44 4.29c.07.04.11.12.11.21v8.58c0 .08-.04.16-.11.21l-7.44 4.29c-.06.04-.16.04-.22 0L10.6 20c-.06-.03-.14-.03-.2 0-.53.3-.63.36-1.12.51-.12.04-.31.11.07.32l2.48 1.47c.24.14.5.21.78.21s.54-.07.78-.21l7.44-4.29c.48-.28.78-.8.78-1.36V7.71c0-.56-.3-1.08-.78-1.36l-7.44-4.3c-.23-.13-.51-.2-.78-.2z"/>
                  </svg>
                  <span>Powered by Node.js</span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-decoration">
            <div className="footer-orb footer-orb-1"></div>
            <div className="footer-orb footer-orb-2"></div>
          </div>

        </div>
      </footer>

      <button 
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Volver arriba"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </button>

    </div>
  );
}

export default Home;