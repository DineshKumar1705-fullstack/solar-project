const express = require('express');
const router = express.Router();
const {
  createIndent,
  getAllIndents,
  getIndentById,
  updateIndent,
  deleteIndent
} = require('../controllers/indentController');

router.post('/indents', createIndent);
router.get('/indents', getAllIndents);
router.get('/indents/:id', getIndentById);
router.put('/indents/:id', updateIndent);
router.delete('/indents/:id', deleteIndent);

module.exports = router;
