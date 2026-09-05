import re

with open('frontend/src/pages/Citizen.tsx', 'r') as f:
    content = f.read()

# Add Helpline to header
old_header = """          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleSync}
              disabled={isSyncing}"""

new_header = """          <div className="flex gap-2 shrink-0">
            <div className="hidden md:flex px-4 py-1.5 bg-blue-950/40 rounded-lg border border-blue-900/50 flex-col justify-center shadow-[0_0_10px_rgba(59,130,246,0.1)] mr-2">
              <span className="block text-[15px] font-black text-blue-400 leading-tight">1078 / 112</span>
              <span className="text-[9px] text-blue-400/80 uppercase tracking-widest font-bold">24x7 Helpline</span>
            </div>
            <button 
              onClick={handleSync}
              disabled={isSyncing}"""

content = content.replace(old_header, new_header)

with open('frontend/src/pages/Citizen.tsx', 'w') as f:
    f.write(content)
