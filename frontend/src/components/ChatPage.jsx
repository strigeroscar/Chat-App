import { useState, useEffect, useRef} from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ChatPage.css';
import { Link, } from 'react-router-dom'

const ChatPage = () => {
  const [messages, setMessages] = useState([]);//sparar en array av messages
  const [newMessage, setNewMessage] = useState('');//sparar innehåll av ett nytt meddelande
  const [userId, setUserId] = useState(null);//sparar userid
  const { conversationId } = useParams(); //via use params så hämtas conversations id från URLen för att rendera rätt conversation
  const chatContainerRef = useRef(null);

  useEffect(() => {
   // const storedToken = localStorage.getItem('token');//kollade på möjligheter att få token att fungera som variabel för conversationer men lyckades inte
    const storedUserId = localStorage.getItem('userId');//hämtar userID från localstorage
    //console.log(storedUserId);
    if (storedUserId) {//kollar om storedUserId finns
      setUserId(storedUserId);
      fetchConversation();//om userID finns så laddas conversationer baserat på conversations id:et
    }

  }, []);

  const fetchConversation = async () => {
    try {
      const response = await axios.get(`http://localhost:8800/messages/${conversationId}`);//GET med axios, för att hämta conversations meddelanden från databasen och sparar dem i response variabeln
      const messagePromises = response.data.messages.map((message) => {//response.data.messages är en array av meddelanden tagna från databasen.
        // map använder vi då för att kunna jobba med 'messages' arrayen för att kunna hämta användarnamnet på sändaren
        return axios.get(`http://localhost:8800/users/${message.sender_id}`).then((userResponse) => {
          const senderUsername = userResponse.data.username;//hämtar användarnamnet
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;//chatContainerRef gör så att chattrutan scrollar till botten när ett nytt meddelande skickas i chatten
          return { ...message, senderUsername };//returnar meddelande och användarnamn
        });
      });

      Promise.all(messagePromises)//väntar på att messagePromises arrayens värden att bli satta
        .then((messagesWithUsername) => {//messagesWithUsername är en array av meddelanden och användare
          setMessages(messagesWithUsername);
        })
        .catch((error) => {//errorhantering
          console.error(error);
        });
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const sendMessage = () => {//funktion för att skicka meddelande
    axios
      .post('http://localhost:8800/messages', {//gör en post till messages tabellen
        content: newMessage,//innehållet på meddelandet
        sender_id: userId,//den inloggades användar id
        conversation_id: conversationId,//conversationens id taget från URLen
      })
      .then((response) => {
        const newMessage = response.data.message;//innehåller det nya meddelandet från servern
        const senderUsername = response.data.username;//innehåller änvändarens användarnamn från servern
        const messageWithUsername = { ...newMessage, senderUsername };//lägger ihop newmessage med senderusername och bildar message with username
        setMessages((prevMessages) => [...prevMessages, messageWithUsername]);//prevmessage är en förkortning för previous messages.
        setNewMessage('');//gör så att man kan skriva fler meddelanden efter att man skrivit ett genom att tömma newMessage's state
        fetchConversation();//updaterar conversationens meddelanden, inkluderar de nya meddelandena som skickats
      })
      .catch((error) => {//error
        console.error('Error sending message', error);
      });
  };


  return (
    <div className='wrapper'>
        <div className="container">
          <div className="header">
          <Link to= "/conversations"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-caret-left-fill" viewBox="0 2 16 16">
  <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
</svg></Link>
        <h1>Chat</h1>
        </div>
        <div className="chat-container" ref={chatContainerRef}>
          <div className="message-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender_id.toString() === userId ? 'message-right' : 'message-left'}`}
              >
                <div className='message-content'>
                <strong>{message.senderUsername} </strong>
                <br />
                {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
      </div>
      </div>
      );
    };



export default ChatPage;
