"use client";

import { Mail, Phone, Globe, Heart } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export function AuthFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
          {/* App Info */}
          <div className="text-center md:text-left">
            <h3 className="mb-2 text-lg font-bold text-white">
              CosMos AI
            </h3>
            <p className="text-sm text-gray-300">
              Advanced tracking and analytics platform for modern businesses
            </p>
          </div>

          {/* Contact Info */}
          <div className="text-center">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
              Contact Us
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-200">
                <Phone className="h-4 w-4" />
                <button
                  onClick={async () => {
                    const success = await copyToClipboard("01012345678");
                    if (success) {
                      alert("Phone number copied to clipboard!");
                    }
                  }}
                  className="transition-colors hover:text-white hover:cursor-pointer"
                >
                  01012345678
                </button>
              </div>
              <a
                href="mailto:jcg@gmail.com"
                className="flex items-center justify-center gap-2 text-sm text-gray-200 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4" />
                <span>jcg@gmail.com</span>
              </a>
              <a
                href="https://jcg.asia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-gray-200 transition-colors hover:text-white"
              >
                <Globe className="h-4 w-4" />
                <span>jcg.asia</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <div className="mb-2 flex items-center justify-center gap-2 md:justify-end">
              <span className="text-sm text-gray-300">Made with</span>
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              <span className="text-sm text-gray-300">by</span>
            </div>
            <p className="text-lg font-bold text-white">JCG .Inc</p>
            <p className="mt-1 text-xs text-gray-400">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-gray-400 md:flex-row">
            <div className="flex flex-wrap justify-center gap-4">
              <button className="transition-colors hover:text-white">
                Privacy Policy
              </button>
              <span>•</span>
              <button className="transition-colors hover:text-white">
                Terms of Service
              </button>
              <span>•</span>
              <button className="transition-colors hover:text-white">
                Cookie Policy
              </button>
            </div>
            <div className="text-center md:text-right">
              Version 1.0.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

