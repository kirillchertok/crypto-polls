import express from 'express';
import Poll from '../models/Poll';

const router = express.Router();

// Получить все опросы
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find();
    res.json(polls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// Получить опрос по ID
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findOne({ id: req.params.id });
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// Создать новый опрос
router.post('/', async (req, res) => {
  try {
    const poll = new Poll(req.body);
    await poll.save();
    res.status(201).json(poll);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create poll' });
  }
});

// Удалить опрос
router.delete('/:id', async (req, res) => {
  try {
    await Poll.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

router.get('/creator/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const polls = await Poll.find({ creator: wallet })
      .sort({ createdAt: -1 });

    res.json(polls);
  } catch (error) {
    console.error('Error fetching user polls:', error);
    res.status(500).json({ error: 'Failed to fetch user polls' });
  }
});

export default router;