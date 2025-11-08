import express from 'express';
import PollResult from '../models/PollResult';

const router = express.Router();

// Отправить результаты опроса
router.post('/', async (req, res) => {
  try {
    const { pollId, userWallet, answers } = req.body;
    
    const result = new PollResult({
      pollId,
      userWallet,
      answers,
      timestamp: new Date().toISOString()
    });
    
    await result.save();
    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already taken this poll' });
    }
    res.status(400).json({ error: 'Failed to submit results' });
  }
});

// Получить результаты конкретного опроса
router.get('/poll/:pollId', async (req, res) => {
  try {
    const results = await PollResult.find({ pollId: req.params.pollId });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Получить результаты конкретного пользователя
router.get('/user/:wallet', async (req, res) => {
  try {
    const results = await PollResult.find({ userWallet: req.params.wallet });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user results' });
  }
});

// Проверить, прошел ли пользователь опрос
router.get('/check/:pollId/:wallet', async (req, res) => {
  try {
    const result = await PollResult.findOne({ 
      pollId: req.params.pollId, 
      userWallet: req.params.wallet 
    });
    res.json({ hasTaken: !!result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check poll status' });
  }
});

export default router;