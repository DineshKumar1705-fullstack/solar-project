const Indent = require('../models/Indent');
const IndentItem = require('../models/IndentItem');
const sequelize = require('../db');

const createIndent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...headerData } = req.body;
    const indent = await Indent.create(headerData, { transaction: t });

    if (items && Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((item) => ({
        Indent_ID: indent.ID,
        Materials: item.Materials,
        Quantity: Number(item.Quantity) || 1,
        Unit: item.Unit || 'Nos',
        Status: item.Status || 'Ready to Issue',
        PO_WO: !!item.PO_WO
      }));
      await IndentItem.bulkCreate(itemsToCreate, { transaction: t });
    }

    await t.commit();

    const result = await Indent.findByPk(indent.ID, {
      include: [{ model: IndentItem, as: 'items' }]
    });
    res.status(201).json(result);
  } catch (err) {
    await t.rollback();
    console.error('Error creating indent:', err);
    res.status(500).json({ error: 'Internal server error while creating indent' });
  }
};

const getAllIndents = async (req, res) => {
  try {
    const indents = await Indent.findAll({
      order: [['ID', 'DESC']],
      include: [{ model: IndentItem, as: 'items' }]
    });
    res.status(200).json(indents);
  } catch (err) {
    console.error('Error fetching indents:', err);
    res.status(500).json({ error: 'Internal server error while fetching indents' });
  }
};

const getIndentById = async (req, res) => {
  try {
    const indent = await Indent.findByPk(req.params.id, {
      include: [{ model: IndentItem, as: 'items' }]
    });
    if (indent) {
      res.status(200).json(indent);
    } else {
      res.status(404).json({ error: 'Indent not found' });
    }
  } catch (err) {
    console.error('Error fetching indent by ID:', err);
    res.status(500).json({ error: 'Internal server error while fetching indent' });
  }
};

const updateIndent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const indent = await Indent.findByPk(req.params.id, { transaction: t });
    if (!indent) {
      await t.rollback();
      return res.status(404).json({ error: 'Indent not found' });
    }

    const { items, ...headerData } = req.body;
    await indent.update(headerData, { transaction: t });

    if (items && Array.isArray(items)) {
      await IndentItem.destroy({ where: { Indent_ID: indent.ID }, transaction: t });
      if (items.length > 0) {
        const itemsToCreate = items.map((item) => ({
          Indent_ID: indent.ID,
          Materials: item.Materials,
          Quantity: Number(item.Quantity) || 1,
          Unit: item.Unit || 'Nos',
          Status: item.Status || 'Ready to Issue',
          PO_WO: !!item.PO_WO
        }));
        await IndentItem.bulkCreate(itemsToCreate, { transaction: t });
      }
    }

    await t.commit();

    const result = await Indent.findByPk(indent.ID, {
      include: [{ model: IndentItem, as: 'items' }]
    });
    res.status(200).json(result);
  } catch (err) {
    await t.rollback();
    console.error('Error updating indent:', err);
    res.status(500).json({ error: 'Internal server error while updating indent' });
  }
};

const deleteIndent = async (req, res) => {
  try {
    const indent = await Indent.findByPk(req.params.id);
    if (indent) {
      await IndentItem.destroy({ where: { Indent_ID: indent.ID } });
      await indent.destroy();
      res.status(200).json({ message: 'Indent deleted successfully' });
    } else {
      res.status(404).json({ error: 'Indent not found' });
    }
  } catch (err) {
    console.error('Error deleting indent:', err);
    res.status(500).json({ error: 'Internal server error while deleting indent' });
  }
};

module.exports = {
  createIndent,
  getAllIndents,
  getIndentById,
  updateIndent,
  deleteIndent
};
