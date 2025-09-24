"use client";

import { useState } from 'react';
import MakerTab from '@/components/MakerTab';
import ResolverTab from '@/components/ResolverTab';
import AdminTab from '@/components/AdminTab';
import { NetworkValidation } from '@/components/NetworkValidation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('maker');

  const tabs = [
    { id: 'maker', label: 'Maker', component: <MakerTab /> },
    { id: 'resolver', label: 'Resolver', component: <ResolverTab /> },
    { id: 'admin', label: 'Admin', component: <AdminTab /> },
  ];

  return (
    <NetworkValidation>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Order Protocol Dashboard
          </h1>
          <p className="text-gray-600">
            Manage makers, resolvers, and protocol administration
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1 inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </div>
    </NetworkValidation>
  );
}
