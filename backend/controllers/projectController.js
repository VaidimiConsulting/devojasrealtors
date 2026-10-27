const { Project, Plot } = require('../models');
const { Op } = require('sequelize');

// @desc Get all projects
// @route GET /api/projects
const getProjects = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { project_id: { [Op.like]: `%${q}%` } },
        { location: { [Op.like]: `%${q}%` } },
        { city: { [Op.like]: `%${q}%` } }
      ];
    }

    const projects = await Project.findAll({
      where,
      include: [
        {
          model: Plot,
          as: 'plots',
          attributes: ['id', 'status', 'price', 'size_sqft']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const data = projects.map(p => {
      const plots = p.plots || [];
      const totalPlots = plots.length;
      const availablePlots = plots.filter(x => x.status === 'available').length;
      const bookedPlots = plots.filter(x => x.status === 'booked').length;
      const soldPlots = plots.filter(x => x.status === 'sold').length;
      return {
        ...p.toJSON(),
        plot_counts: {
          total: totalPlots,
          available: availablePlots,
          booked: bookedPlots,
          sold: soldPlots
        }
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// @desc Get single project with plots
// @route GET /api/projects/:id
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: Plot,
          as: 'plots'
        }
      ]
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc Create a project
// @route POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const {
      project_id, name, location, city, developer_name, description, facilities, status
    } = req.body;

    if (!name || !location) {
      return res.status(400).json({ success: false, message: 'Project name and location are required' });
    }

    // Auto-generate project_id if not provided
    const code = project_id || `PROJ-${Date.now().toString().slice(-4)}`;

    const existing = await Project.findOne({ where: { project_id: code } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Project ID ${code} already exists` });
    }

    const project = await Project.create({
      project_id: code,
      name,
      location,
      city: city || null,
      developer_name: developer_name || 'Devojas Realtors Pvt Ltd',
      description: description || null,
      facilities: facilities || null,
      status: status || 'active'
    });

    res.status(201).json({ success: true, message: 'Project created successfully', data: project });
  } catch (error) {
    next(error);
  }
};

// @desc Update a project
// @route PUT /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await project.update(req.body);
    res.json({ success: true, message: 'Project updated successfully', data: project });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a project
// @route DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const plotCount = await Plot.count({ where: { project_id: project.id } });
    if (plotCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete project because it contains ${plotCount} plots. Please delete or reassign them first.`
      });
    }

    await project.destroy();
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};
