const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./db');

const stockRoutes = require('./routes/stockRoutes');
const indentRoutes = require('./routes/indentRoutes');
const engineerRoutes = require('./routes/engineerRoutes');
const cartRoutes = require('./routes/cartRoutes');
const Indent = require('./models/Indent');
const IndentItem = require('./models/IndentItem');

// Automatically ensure indent_items table exists
IndentItem.sync().catch((err) => console.log('IndentItem sync notice:', err.message));

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use('/api', stockRoutes);
app.use('/api', indentRoutes);
app.use('/api', engineerRoutes);
app.use('/api', cartRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on the Port ${PORT}`);
});