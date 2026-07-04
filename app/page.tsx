'use client';

import React from 'react';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { Toaster } from 'react-hot-toast';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <Dashboard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#171717',
            color: '#f3f4f6',
            border: '1px solid #262626',
            fontSize: '13px',
          },
        }}
      />
    </div>
  );
}
