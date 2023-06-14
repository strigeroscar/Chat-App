import { useState } from 'react';
import axios from 'axios';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useNavigate, Link } from 'react-router-dom';
import './NewConversationForm.css'
import CloseButton from 'react-bootstrap/CloseButton';




const NewConversationForm = () => {
  const [user2Id, setUser2Id] = useState('');
  const navigate = useNavigate();
  const handleSubmit = async (event) => {
    event.preventDefault();
    const user1Id = localStorage.getItem('userId');
    try {
      const response = await axios.post('http://localhost:8800/conversations', {
        user1_id: user1Id,
        user2_id: user2Id
      });
      console.log('Conversation created:', response.data);
      navigate('/conversations');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };


  const handleChange = (event) => {
    setUser2Id(event.target.value);
  };




  return (
    <div className='newconversationform-page'>
        <div className='newconversationform'>
            <div className='newconversation'>
                <Link className='cancel-button' to='/conversations'>
                <CloseButton/>
                </Link>
                <h2 className='headerLinus'>Chat with a new friend!</h2>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="user2_id">
                        <Form.Label>Put in your friends ID:</Form.Label>
                        <Form.Control type="text" name="user2_id" value={user2Id} onChange={handleChange} />
                    </Form.Group>
                    <Button className='submit-button' variant="primary" type="submit">
                        Create
                    </Button>
                </Form>
            </div>
        </div>
    </div>
  );
};


export default NewConversationForm;
