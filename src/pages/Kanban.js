import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AvatarGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const mockColumns = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#f44336',
    tasks: [
      {
        id: 1,
        title: 'Design new landing page',
        description: 'Create a modern and responsive landing page',
        priority: 'high',
        assignees: ['JD', 'JS'],
        dueDate: '2024-02-15',
        tags: ['Design', 'UI/UX'],
      },
      {
        id: 2,
        title: 'Setup database schema',
        description: 'Design and implement the database structure',
        priority: 'medium',
        assignees: ['MJ'],
        dueDate: '2024-02-20',
        tags: ['Backend', 'Database'],
      },
    ],
  },
  {
    id: 'inprogress',
    title: 'In Progress',
    color: '#ff9800',
    tasks: [
      {
        id: 3,
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        priority: 'high',
        assignees: ['SW', 'TB'],
        dueDate: '2024-02-18',
        tags: ['Backend', 'Security'],
      },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    color: '#2196f3',
    tasks: [
      {
        id: 4,
        title: 'Code review for API endpoints',
        description: 'Review and test all API endpoints',
        priority: 'medium',
        assignees: ['JD'],
        dueDate: '2024-02-16',
        tags: ['Review', 'API'],
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    color: '#4caf50',
    tasks: [
      {
        id: 5,
        title: 'Project setup and configuration',
        description: 'Initial project setup with all dependencies',
        priority: 'low',
        assignees: ['JS', 'MJ'],
        dueDate: '2024-02-10',
        tags: ['Setup', 'Configuration'],
      },
    ],
  },
];

export const Kanban = () => {
  const [columns, setColumns] = useState(mockColumns);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('todo');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignees: [],
    dueDate: '',
    tags: [],
  });

  const handleOpenDialog = (task, columnId) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignees: task.assignees,
        dueDate: task.dueDate,
        tags: task.tags,
      });
    } else {
      setEditingTask(null);
      setSelectedColumn(columnId);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assignees: [],
        dueDate: '',
        tags: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSaveTask = () => {
    if (editingTask) {
      // Update existing task
      setColumns(prev => prev.map(column => ({
        ...column,
        tasks: column.tasks.map(task =>
          task.id === editingTask.id ? { ...task, ...formData } : task
        )
      })));
    } else {
      // Add new task
      const newTask = {
        id: Date.now(),
        ...formData,
      };
      setColumns(prev => prev.map(column =>
        column.id === selectedColumn
          ? { ...column, tasks: [...column.tasks, newTask] }
          : column
      ));
    }
    handleCloseDialog();
  };

  const handleDeleteTask = (taskId) => {
    setColumns(prev => prev.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => task.id !== taskId)
    })));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const onDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, targetColumnId) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    
    setColumns(prev => {
      const newColumns = [...prev];
      let draggedTask = null;
      
      // Remove task from source column
      newColumns.forEach(column => {
        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          draggedTask = column.tasks.splice(taskIndex, 1)[0];
        }
      });
      
      // Add task to target column
      if (draggedTask) {
        const targetColumn = newColumns.find(column => column.id === targetColumnId);
        if (targetColumn) {
          targetColumn.tasks.push(draggedTask);
        }
      }
      
      return newColumns;
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Kanban Board
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null, 'todo')}
          sx={{
            background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
          }}
        >
          Add Task
        </Button>
      </Box>

      <Grid container spacing={3}>
        {columns.map((column) => (
          <Grid item xs={12} sm={6} md={3} key={column.id}>
            <Card
              sx={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: column.color,
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    {column.title}
                  </Typography>
                  <Chip
                    label={column.tasks.length}
                    size="small"
                    sx={{ backgroundColor: column.color, color: 'white' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(null, column.id)}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </CardContent>
              
              <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
                {column.tasks.map((task) => (
                  <Card
                    key={task.id}
                    sx={{
                      mb: 2,
                      cursor: 'grab',
                      '&:hover': {
                        boxShadow: 3,
                      },
                    }}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                          {task.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {task.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {task.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                        <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                          {task.assignees.map((assignee, index) => (
                            <Avatar key={index} sx={{ bgcolor: 'primary.main' }}>
                              {assignee}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Due: {task.dueDate}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Add New Task'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveTask}
            variant="contained"
            disabled={!formData.title}
            sx={{
              background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
            }}
          >
            {editingTask ? 'Update' : 'Create'} Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};