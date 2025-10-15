import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Card, InputGroup } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactMarkdown from 'react-markdown';
import './App.css'; // Para estilos personalizados
import Fiologo from './fiochatlogo.png'; 

// --- Configuración de la API de Gemini ---
// NOTA: La API Key se deja para que Canvas la reemplace.
const GEMINI_API_KEY = 'AIzaSyDmTFV6aOq0E0B8bTf_gwf31ZTRXwa_Rrs'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 1. CONTEXTO INICIAL: Definimos la instrucción de sistema para guiar a la IA.
// SE HACE MÁS FLEXIBLE para evitar que el modelo se bloquee o se corte.
const SYSTEM_INSTRUCTION = "Eres un profesor de inteligencia artificial amigable, conciso y entusiasta, diseñado para responder preguntas de estudiantes de secundaria o universidad. Tu principal función es explicar conceptos de IA, aprendizaje automático y curiosidades relacionadas. Sé breve y usa un tono motivador. Responde siempre en español. Utiliza formato Markdown como **negrita** para destacar términos clave.";

function App() {
  // Inicializamos messages con el mensaje de bienvenida.
  const [messages, setMessages] = useState([
    { text: "¡Hola! Soy tu asistente de IA. **Pregúntame** sobre cómo funciona la Inteligencia Artificial o cualquier **curiosidad** que tengas.", sender: 'bot' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Función para construir el historial de conversación en el formato requerido por la API
  const buildContents = (currentMessage) => {
    // Mapeamos todos los mensajes (excepto el inicial) a la estructura 'role' y 'parts' de la API.
    const history = messages.slice(1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));
    
    // Agregamos el mensaje actual del usuario
    history.push({ role: 'user', parts: [{ text: currentMessage }] });

    return history;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageToSend = inputMessage.trim();
    if (messageToSend === '' || isTyping) return;

    const userMessage = { text: messageToSend, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const contentsPayload = buildContents(messageToSend);

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 1. Instrucción del sistema (CORREGIDA al formato Content para evitar Error 400)
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          
          // 2. Contenido de la conversación (Historial y Mensaje Actual)
          contents: contentsPayload,

          // 3. Configuración de generación (AUMENTADA a 500 para evitar respuestas cortadas)
          generationConfig: {
              maxOutputTokens: 500 
          }
        }),
      });

      if (!response.ok) {
        // Leemos el cuerpo del error para un diagnóstico más claro en la consola
        const errorText = await response.text();
        console.error("Gemini Error Body:", errorText);
        throw new Error(`Error HTTP: ${response.status} - ${errorText.substring(0, 100)}...`);
      }

      const data = await response.json();
      const botResponse = {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude obtener una respuesta concisa.',
        sender: 'bot'
      };
      setMessages(prevMessages => [...prevMessages, botResponse]);

    } catch (error) {
      console.error("Error al comunicarse con Gemini:", error);
      // Mensaje de error más descriptivo
      setMessages(prevMessages => [...prevMessages, { text: `¡Ups! Ocurrió un error al conectar: ${error.message}.`, sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Container fluid className="d-flex flex-column vh-100 bg-dark text-light p-0">
      
      {/* --- ENCABEZADO ESTRUCTURADO (Logo a la izquierda) --- */}
      <Row className="bg-dark-alt align-items-center p-3 border-bottom border-pink header-bar">
        {/* Lado Izquierdo: Logo y Título "Fiochat" */}
        <Col xs={12} md={6} className="d-flex align-items-center justify-content-center justify-content-md-start mb-2 mb-md-0">
          <img 
            src={Fiologo} 
            alt="Logo Fiochat IA" 
            style={{ width: '40px', height: '40px', marginRight: '10px', borderRadius: '8px' }}
          />
          <h1 className="text-pink mb-0 header-title">Fiochat</h1>
        </Col>
        
        {/* Lado Derecho: Texto descriptivo */}
        <Col xs={12} md={6} className="text-center text-md-right">
          <h3 className="text-light mb-0 header-subtitle">Chatbot de IA: Explorando la Inteligencia Artificial </h3>
        </Col>
      </Row>
      {/* --- FIN DEL ENCABEZADO --- */}

      <Row className="flex-grow-1 overflow-hidden">
        <Col className="d-flex flex-column p-4">
          <Card className="flex-grow-1 bg-secondary text-light border-pink chat-window">
            <Card.Body className="d-flex flex-column overflow-auto p-3">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-2 d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                    {/* Usamos ReactMarkdown para renderizar el formato **negrita** */}
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="mb-2 d-flex justify-content-start">
                  <div className="message-bubble bot-bubble typing-indicator">
                    <span>•</span><span>•</span><span>•</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </Card.Body>
          </Card>
          <Form onSubmit={handleSendMessage} className="mt-3">
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Pregunta sobre IA o alguna curiosidad..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="bg-dark text-light border-pink input-control"
              />
              <Button type="submit" variant="pink" disabled={isTyping}>
                {isTyping ? 'Enviando...' : 'Enviar'}
              </Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
