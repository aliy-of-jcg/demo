"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { apiSpec } from '@/lib/api-spec';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// Custom CSS to fix Swagger UI sidebar width and text stacking
const swaggerCustomStyles = `
  /* Fix main opblock tags */
  .swagger-ui .opblock-tag {
    min-width: 200px !important;
    width: auto !important;
  }
  
  .swagger-ui .opblock-tag-section {
    min-width: 200px !important;
  }
  
  .swagger-ui .opblock-tag-section h3 {
    word-break: keep-all !important;
    white-space: normal !important;
    overflow-wrap: normal !important;
  }
  
  /* Fix filter/sidebar navigation text stacking */
  .swagger-ui .filter-container {
    min-width: 250px !important;
    width: 100% !important;
  }
  
  .swagger-ui .filter-container input {
    width: 100% !important;
  }
  
  /* Fix tags list in sidebar */
  .swagger-ui .btn {
    white-space: normal !important;
    word-break: keep-all !important;
    text-align: left !important;
    min-width: 200px !important;
    width: 100% !important;
    padding: 8px 12px !important;
    line-height: 1.5 !important;
  }
  
  /* Fix all text elements to prevent vertical stacking */
  .swagger-ui * {
    word-break: keep-all !important;
  }
  
  .swagger-ui .info {
    margin-bottom: 2rem;
  }
  
  /* Desktop specific fixes */
  @media (min-width: 769px) {
    .swagger-ui .wrapper {
      padding: 20px !important;
    }
  }
  
  @media (max-width: 768px) {
    .swagger-ui .opblock-tag,
    .swagger-ui .btn {
      min-width: 150px !important;
    }
    
    .swagger-ui .filter-container {
      min-width: 150px !important;
    }
  }
`;

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Inject custom styles
    const style = document.createElement('style');
    style.innerHTML = swaggerCustomStyles;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-auto bg-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">API Documentation</h1>
          <p className="text-base md:text-lg text-gray-600">
            Complete API reference for the CosMos AI Analytics & Tracking System
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <SwaggerUI
            spec={apiSpec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            tryItOutEnabled={true}
          />
        </div>
      </div>
    </div>
  );
}

