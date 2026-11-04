# Business Operations System - UI/UX Design Specification

## AI Design Prompt

Use this document as the single source of truth when designing and implementing the Business Operations System.

The application is a modern SaaS-style business management platform that includes Dashboard, Inventory Management, Point of Sale (POS), Reports, User Management, and Settings.

The visual style should be inspired by modern enterprise applications such as Stripe Dashboard, Linear, Vercel, Clerk, Notion, and Shopify Admin.

### Design Goals

* Clean and professional
* Modern SaaS aesthetic
* Optimized for business operations
* Fast cashier workflow for POS
* Consistent design system
* Minimal visual noise
* White surfaces with subtle borders
* Limited shadow usage
* Fully responsive
* Accessibility-friendly
* Designed using an 8px spacing system

### User Roles

#### ADMIN

Can access:

* Dashboard
* Inventory
* POS
* Reports
* Users
* Settings

#### USER

Can access:

* Inventory
* POS

Restricted:

* Dashboard
* Reports
* Users
* Settings

---

# Layout System

## Application Shell

```text
┌─────────────────────────────────────┐
│ Top Navigation (64px)               │
├──────────┬──────────────────────────┤
│ Sidebar  │ Main Content             │
│ 240px    │ Fluid                    │
└──────────┴──────────────────────────┘
```

## Sidebar

| Property        | Value             |
| --------------- | ----------------- |
| Width           | 240px             |
| Collapsed Width | 72px              |
| Background      | #FFFFFF           |
| Border          | 1px solid #E2E8F0 |

## Top Navigation

| Property           | Value             |
| ------------------ | ----------------- |
| Height             | 64px              |
| Background         | #FFFFFF           |
| Border Bottom      | 1px solid #E2E8F0 |
| Horizontal Padding | 24px              |

## Main Content

| Property    | Value  |
| ----------- | ------ |
| Max Width   | 1600px |
| Padding     | 24px   |
| Section Gap | 24px   |

---

# Color System

## Brand Colors

| Token         | Value   |
| ------------- | ------- |
| Primary       | #2563EB |
| Primary Hover | #1D4ED8 |
| Primary Light | #DBEAFE |

## Neutral Colors

| Token    | Value   |
| -------- | ------- |
| Gray 50  | #F8FAFC |
| Gray 100 | #F1F5F9 |
| Gray 200 | #E2E8F0 |
| Gray 400 | #94A3B8 |
| Gray 600 | #475569 |
| Gray 900 | #0F172A |

## Semantic Colors

| Token   | Value   |
| ------- | ------- |
| Success | #16A34A |
| Warning | #F59E0B |
| Danger  | #DC2626 |
| Info    | #0284C7 |

---

# Surface Colors

| Token               | Value   |
| ------------------- | ------- |
| Page Background     | #F8FAFC |
| Sidebar Background  | #FFFFFF |
| Card Background     | #FFFFFF |
| Hover Background    | #F1F5F9 |
| Selected Background | #EFF6FF |

---

# Typography

## Font Family

```css
Inter,
ui-sans-serif,
system-ui,
sans-serif
```

## Font Scale

| Style      | Size | Weight |
| ---------- | ---- | ------ |
| Display    | 30px | 700    |
| H1         | 24px | 700    |
| H2         | 20px | 600    |
| H3         | 18px | 600    |
| Body       | 16px | 400    |
| Body Small | 14px | 400    |
| Caption    | 12px | 400    |

## Text Colors

| Token     | Value   |
| --------- | ------- |
| Primary   | #0F172A |
| Secondary | #475569 |
| Muted     | #94A3B8 |
| Disabled  | #CBD5E1 |

---

# Spacing System

Base Unit: 8px

## Tokens

```text
4px
8px
12px
16px
24px
32px
40px
48px
64px
```

## Common Usage

| Usage         | Value |
| ------------- | ----- |
| Input Padding | 12px  |
| Button Gap    | 8px   |
| Card Padding  | 24px  |
| Page Gap      | 24px  |
| Section Gap   | 32px  |

---

# Border Radius

| Token       | Value |
| ----------- | ----- |
| Small       | 8px   |
| Medium      | 12px  |
| Large       | 16px  |
| Extra Large | 20px  |

## Usage

| Component | Radius |
| --------- | ------ |
| Buttons   | 8px    |
| Inputs    | 8px    |
| Cards     | 12px   |
| Modals    | 16px   |

---

# Shadows

## Card

```css
0 1px 2px rgba(0,0,0,0.05)
```

## Dropdown

```css
0 4px 12px rgba(0,0,0,0.08)
```

## Modal

```css
0 20px 40px rgba(0,0,0,0.12)
```

---

# Sidebar Navigation

| Property      | Value |
| ------------- | ----- |
| Item Height   | 40px  |
| Item Padding  | 12px  |
| Item Gap      | 12px  |
| Border Radius | 8px   |
| Icon Size     | 18px  |

## Selected State

```css
background: #EFF6FF;
color: #2563EB;
```

## Hover State

```css
background: #F1F5F9;
```

---

# Buttons

## Primary Button

```css
height: 40px;
padding-inline: 16px;
background: #2563EB;
color: #FFFFFF;
font-weight: 600;
border-radius: 8px;
```

## Secondary Button

```css
height: 40px;
background: #FFFFFF;
border: 1px solid #E2E8F0;
color: #0F172A;
border-radius: 8px;
```

## Danger Button

```css
height: 40px;
background: #DC2626;
color: #FFFFFF;
border-radius: 8px;
```

---

# Inputs

```css
height: 40px;
padding: 12px;
border: 1px solid #E2E8F0;
border-radius: 8px;
```

## Focus State

```css
border-color: #2563EB;
box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
```

---

# Dashboard

## KPI Cards

```css
height: 120px;
padding: 24px;
border-radius: 12px;
border: 1px solid #E2E8F0;
```

## Layout

```css
grid-template-columns: repeat(4, 1fr);
gap: 24px;
```

## KPI Metrics

* Total Sales
* Transactions
* Inventory Count
* Gross Profit

---

# Inventory Module

## Features

* Inventory List
* Search
* Category Filter
* Add Item
* Edit Item
* Delete Item

## Table

| Property      | Value |
| ------------- | ----- |
| Header Height | 52px  |
| Row Height    | 48px  |
| Cell Padding  | 16px  |

## Columns

* SKU
* Name
* Category
* Stock
* Price
* Status
* Actions

---

# POS Module

## Layout

```css
grid-template-columns: 2fr 1fr;
```

## Distribution

* 70% Product Catalog
* 30% Cart Panel

## Product Card

```css
width: 160px;
height: 180px;
padding: 12px;
border-radius: 12px;
```

### Content

* Product Image
* Product Name
* Price
* Available Stock

## Cart Panel

Recommended Width:

```css
400px
```

### Content

* Cart Items
* Quantity Controls
* Discounts
* Payment Method
* Total Amount
* Checkout Action

---

# Reports Module

ADMIN ONLY

## Features

* Daily Sales
* Weekly Sales
* Monthly Sales
* Inventory Movement
* Top Products
* CSV Export
* PDF Export

## Charts

* Line Chart
* Bar Chart
* Pie Chart

---

# Users Module

ADMIN ONLY

## Columns

* Name
* Email
* Role
* Status
* Last Login

## Actions

* Create User
* Edit User
* Disable User
* Reset Password

---

# Settings Module

ADMIN ONLY

## Sections

* Business Information
* Tax Configuration
* Receipt Configuration
* POS Preferences
* User Preferences
* System Preferences

---

# Iconography

## Recommended Library

Lucide Icons

## Icon Sizes

| Usage   | Size |
| ------- | ---- |
| Sidebar | 18px |
| Cards   | 20px |
| Buttons | 16px |
| Tables  | 16px |

---

# Responsive Breakpoints

| Device        | Width       |
| ------------- | ----------- |
| Mobile        | 0-767px     |
| Tablet        | 768-1023px  |
| Desktop       | 1024-1439px |
| Large Desktop | 1440px+     |

---

# Design Principles

1. Use white surfaces and subtle borders.
2. Prefer borders over heavy shadows.
3. Maintain consistent spacing using the 8px system.
4. Keep card radius at 12px throughout the application.
5. Use Inter typography consistently.
6. Maintain fast workflows for cashiers and inventory staff.
7. Minimize clicks for common business operations.
8. Ensure all tables and forms are optimized for data entry.
9. Keep visual hierarchy clear and predictable.
10. Build a scalable design system that can support future modules.
