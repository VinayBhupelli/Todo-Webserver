package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type Todo struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Due       string `json:"due"`
	Deadline  string `json:"deadline"`
	Done      bool   `json:"done"`
	CreatedAt int64  `json:"createdAt"`
}

var (
	todos  = []Todo{}
	nextID = 1
	mu     sync.Mutex
)

func main() {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	http.HandleFunc("/todos", todosHandler)

	fmt.Println("Server running on http://localhost:8000")

	log.Fatal(http.ListenAndServe(":8000", nil))
}

func todosHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getTodosHandler(w)
	case http.MethodPost:
		createTodoHandler(w, r)
	case http.MethodPut:
		updateTodoHandler(w, r)
	case http.MethodDelete:
		deleteTodoHandler(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getTodosHandler(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	mu.Lock()
	defer mu.Unlock()
	json.NewEncoder(w).Encode(todos)
}

func createTodoHandler(w http.ResponseWriter, r *http.Request) {
	var todo Todo
	if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	mu.Lock()
	todo.ID = nextID
	nextID++
	todo.CreatedAt = time.Now().Unix()
	todos = append(todos, todo)
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(todo)
}

func updateTodoHandler(w http.ResponseWriter, r *http.Request) {
	var updatedTodo Todo
	if err := json.NewDecoder(r.Body).Decode(&updatedTodo); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	mu.Lock()
	defer mu.Unlock()
	for i, todo := range todos {
		if todo.ID == updatedTodo.ID {
			todos[i].Title = updatedTodo.Title
			todos[i].Due = updatedTodo.Due
			todos[i].Deadline = updatedTodo.Deadline
			todos[i].Done = updatedTodo.Done
			json.NewEncoder(w).Encode(todos[i])
			return
		}
	}
	http.Error(w, "Todo not found", http.StatusNotFound)
}

func deleteTodoHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid id parameter", http.StatusBadRequest)
		return
	}
	mu.Lock()
	defer mu.Unlock()
	for i, todo := range todos {
		if todo.ID == id {
			todos = append(todos[:i], todos[i+1:]...)
			fmt.Fprintf(w, "Todo with id %d deleted", id)
			return
		}
	}
	http.Error(w, "Todo not found", http.StatusNotFound)
}
