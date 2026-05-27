# inventory_management.py

import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3

# ===== DATABASE =====
conn = sqlite3.connect("inventory.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS products(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,
    quantity INTEGER,
    price REAL
)
""")

conn.commit()

# ===== FUNCTIONS =====

def add_product():

    name = product_entry.get()
    qty = quantity_entry.get()
    price = price_entry.get()

    if name == "":
        messagebox.showerror("Error", "Enter product name")
        return

    cursor.execute("""
    INSERT INTO products(product_name, quantity, price)
    VALUES(?,?,?)
    """, (name, qty, price))

    conn.commit()

    messagebox.showinfo("Success", "Product Added")

    load_products()
    clear_fields()


def load_products():

    for row in table.get_children():
        table.delete(row)

    cursor.execute("SELECT * FROM products")

    rows = cursor.fetchall()

    for row in rows:
        table.insert("", tk.END, values=row)


def delete_product():

    selected = table.focus()

    if not selected:
        messagebox.showerror("Error", "Select product")
        return

    data = table.item(selected)
    product_id = data['values'][0]

    cursor.execute(
        "DELETE FROM products WHERE id=?",
        (product_id,)
    )

    conn.commit()

    messagebox.showinfo("Deleted", "Product Deleted")

    load_products()


def clear_fields():
    product_entry.delete(0, tk.END)
    quantity_entry.delete(0, tk.END)
    price_entry.delete(0, tk.END)


# ===== GUI =====

root = tk.Tk()
root.title("Inventory Management System")
root.geometry("800x500")

title = tk.Label(
    root,
    text="Inventory Management System",
    font=("Arial", 20, "bold")
)

title.pack(pady=10)

# ===== FORM =====
form = tk.Frame(root)
form.pack()

tk.Label(form, text="Product Name").grid(row=0, column=0)
product_entry = tk.Entry(form)
product_entry.grid(row=0, column=1)

tk.Label(form, text="Quantity").grid(row=1, column=0)
quantity_entry = tk.Entry(form)
quantity_entry.grid(row=1, column=1)

tk.Label(form, text="Price").grid(row=2, column=0)
price_entry = tk.Entry(form)
price_entry.grid(row=2, column=1)

# ===== BUTTONS =====
buttons = tk.Frame(root)
buttons.pack(pady=10)

tk.Button(
    buttons,
    text="Add Product",
    bg="green",
    fg="white",
    command=add_product
).grid(row=0, column=0, padx=10)

tk.Button(
    buttons,
    text="Delete Product",
    bg="red",
    fg="white",
    command=delete_product
).grid(row=0, column=1, padx=10)

# ===== TABLE =====
columns = ("ID", "Product Name", "Quantity", "Price")

table = ttk.Treeview(
    root,
    columns=columns,
    show="headings",
    height=10
)

for col in columns:
    table.heading(col, text=col)

table.pack(pady=20)

load_products()

root.mainloop()