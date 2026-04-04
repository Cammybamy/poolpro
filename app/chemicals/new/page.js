'use client'                                                                                                          
  import { useState } from 'react'                                                                                   
  import { supabase } from '../../../lib/supabase'                                                                      
  import { useRouter, useSearchParams } from 'next/navigation'                                                          
  import Link from 'next/link'                                                                                          
  import { Suspense } from 'react'                                                                                      
                                                                                                                     
  function ChemicalForm() {
    const router = useRouter()
    const searchParams = useSearchParams()                                                                              
    const job_id = searchParams.get('job_id')                                                                           
    const customer_id = searchParams.get('customer_id')                                                                 
    const [form, setForm] = useState({ chlorine: '', ph: '', alkalinity: '', notes: '' })                               
                                                                                                                        
    async function saveLog() {                                                                                          
      await supabase.from('chemical_logs').insert([{                                                                    
        job_id,                                                                                                         
        customer_id,                                                                                                 
        chlorine: form.chlorine || null,
        ph: form.ph || null,
        alkalinity: form.alkalinity || null,                                                                            
        notes: form.notes                                                                                               
      }])                                                                                                               
      router.push(`/jobs/${job_id}`)                                                                                    
    }                                                                                                                

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">                                            
          <Link href={`/jobs/${job_id}`} className="text-white text-xl">←</Link>                                        
          <h1 className="text-xl font-bold">Log Chemicals</h1>                                                          
        </div>                                                                                                          
                                                                                                                        
        <div className="p-4 max-w-lg mx-auto">                                                                          
          <div className="bg-white rounded-xl shadow p-4 space-y-3">                                                 
            <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white"             
  placeholder="Chlorine" value={form.chlorine} onChange={e => setForm({...form, chlorine: e.target.value})} />          
            <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white"             
  placeholder="pH" value={form.ph} onChange={e => setForm({...form, ph: e.target.value})} />                            
            <input type="number" step="1" className="w-full border rounded-lg p-2 text-gray-800 bg-white"               
  placeholder="Alkalinity" value={form.alkalinity} onChange={e => setForm({...form, alkalinity: e.target.value})} />    
            <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes"               
  value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />                                       
            <button onClick={saveLog} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save     
  Log</button>                                                                                                          
          </div>                                                                                                        
        </div>                                                                                                          
      </div>                                                                                                         
    )
  }

  export default function NewChemical() {
    return (                                                                                                            
      <Suspense>                                                                                                        
        <ChemicalForm />                                                                                                
      </Suspense>                                                                                                       
    )                                                                                                                
  }