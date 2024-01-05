import React, { useState, useEffect } from "react";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const Todo = ({ user }) => {
  const [activeTasks, setActiveTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    name: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  });

  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "todos"), (snapshot) => {
      const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const active = tasks.filter((task) => !task.completed);
      const completed = tasks.filter((task) => task.completed);
      setActiveTasks(active);
      setCompletedTasks(completed);
    });

    return () => unsubscribe();
  }, [db]);

  const handleAddTodo = async () => {
    try {
      await addDoc(collection(db, "todos"), {
        ...newTask,
        userId: user.uid,
        timestamp: serverTimestamp(),
        completed: false, // Set the task as not completed initially
      });
      setNewTask({
        name: "",
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      });
    } catch (error) {
      console.error("Error adding task:", error.message);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return; // dropped outside the list

    const sourceList = result.source.droppableId;
    const destinationList = result.destination.droppableId;
    const taskToMove =
      sourceList === "active"
        ? activeTasks[result.source.index]
        : completedTasks[result.source.index];

    if (sourceList === destinationList) {
      // Reordering within the same list
      const updatedTasks = reorderList(
        sourceList === "active" ? activeTasks : completedTasks,
        result.source.index,
        result.destination.index,
      );

      sourceList === "active"
        ? setActiveTasks(updatedTasks)
        : setCompletedTasks(updatedTasks);
    } else {
      // Moving between lists
      const updatedActiveTasks = [...activeTasks];
      const updatedCompletedTasks = [...completedTasks];
      const updatedTask = {
        ...taskToMove,
        completed: destinationList === "completed",
      };

      // Remove task from the source list
      updatedActiveTasks.splice(result.source.index, 1);
      updatedCompletedTasks.splice(result.destination.index, 0, updatedTask);

      setActiveTasks(updatedActiveTasks);
      setCompletedTasks(updatedCompletedTasks);

      // Update Firebase with the new status (completed or active)
      try {
        await updateDoc(doc(db, "todos", taskToMove.id), {
          completed: destinationList === "completed",
        });
      } catch (error) {
        console.error("Error updating task status:", error.message);
      }
    }
  };
  const handlePriorityChange = async (taskId, newPriority) => {
    const updatedTasks = [...activeTasks, ...completedTasks].map((task) =>
      task.id === taskId ? { ...task, priority: newPriority } : task,
    );

    setActiveTasks(updatedTasks.filter((task) => !task.completed));
    setCompletedTasks(updatedTasks.filter((task) => task.completed));

    // Update Firebase with the new priority
    try {
      await updateDoc(doc(db, "todos", taskId), { priority: newPriority });
    } catch (error) {
      console.error("Error updating task priority:", error.message);
    }
  };

  const reorderList = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const removeTask = (list, index) => {
    const result = Array.from(list);
    result.splice(index, 1);
    return result;
  };

  const insertTask = (list, task, index) => {
    const result = Array.from(list);
    result.splice(index, 0, task);
    return result;
  };

  return (
    <div>
      {/* Task input fields and "Add Task" button */}

      <label>Task Name:</label>
      <input
        type="text"
        value={newTask.name}
        onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
      />

      <label>Task Title:</label>
      <input
        type="text"
        value={newTask.title}
        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
      />

      <label>Description:</label>
      <textarea
        value={newTask.description}
        onChange={(e) =>
          setNewTask({ ...newTask, description: e.target.value })
        }
      />

      <label>Due Date:</label>
      <input
        type="date"
        value={newTask.dueDate}
        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
      />

      <label>Priority:</label>
      <select
        value={newTask.priority}
        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <button type="button" onClick={handleAddTodo}>
        Add Task
      </button>
      <br />
      <h2>Active</h2>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: "flex" }}>
          <Droppable droppableId="active" direction="vertical">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {activeTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          padding: 16,
                          margin: "0 0 8px 0",
                          backgroundColor: "lightgrey",
                        }}
                      >
                        <strong>{task.name}</strong> - {task.title} (
                        {task.priority})<p>{task.description}</p>
                        <p>Due Date: {task.dueDate}</p>
                        {/* Add a button to change priority */}
                        <button
                          onClick={() => handlePriorityChange(task.id, "high")}
                        >
                          High Priority
                        </button>
                        <button
                          onClick={() =>
                            handlePriorityChange(task.id, "medium")
                          }
                        >
                          Medium Priority
                        </button>
                        <button
                          onClick={() => handlePriorityChange(task.id, "low")}
                        >
                          Low Priority
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>

          <h2>Completed</h2>
          <Droppable droppableId="completed" direction="vertical">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {completedTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          userSelect: "none",
                          padding: 16,
                          margin: "0 0 8px 0",
                          backgroundColor: "lightgrey",
                        }}
                      >
                        <strong>{task.name}</strong> - {task.title} (
                        {task.priority})<p>{task.description}</p>
                        <p>Due Date: {task.dueDate}</p>
                        {/* Add a button to change priority */}
                        <button
                          onClick={() => handlePriorityChange(task.id, "high")}
                        >
                          High Priority
                        </button>
                        <button
                          onClick={() =>
                            handlePriorityChange(task.id, "medium")
                          }
                        >
                          Medium Priority
                        </button>
                        <button
                          onClick={() => handlePriorityChange(task.id, "low")}
                        >
                          Low Priority
                        </button>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
};

export default Todo;
