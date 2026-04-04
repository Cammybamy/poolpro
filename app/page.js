import Link from 'next/link'                                                                                          
                                                                                                                     
  export default function Home() {
    return (
      <div className="min-h-screen bg-gray-100">                                                                        
        <div className="bg-blue-600 text-white p-6">                                                                    
          <h1 className="text-3xl font-bold">PoolPro</h1>                                                               
          <p className="text-blue-100 mt-1">Pool Service Management</p>                                                 
        </div>                                                                                                          
                                                                                                                        
        <div className="p-6 grid grid-cols-2 gap-4 max-w-lg mx-auto mt-6">                                              
          <Link href="/customers" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">    
            <div className="text-4xl mb-2">👥</div>                                                                     
            <div className="font-semibold text-gray-700">Customers</div>                                                
          </Link>                                                                                                       
                                                                                                                        
          <Link href="/jobs" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">         
            <div className="text-4xl mb-2">🔧</div>                                                                     
            <div className="font-semibold text-gray-700">Jobs</div>                                                     
          </Link>                                                                                                       
                                                                                                                        
          <Link href="/chemicals" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">    
            <div className="text-4xl mb-2">🧪</div>                                                                     
            <div className="font-semibold text-gray-700">Chemical Logs</div>                                            
          </Link>                                                                                                       
                                                                                                                        
          <Link href="/invoices" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">     
            <div className="text-4xl mb-2">🧾</div>                                                                     
            <div className="font-semibold text-gray-700">Invoices</div>                                                 
          </Link>                                                                                                       
        </div>                                                                                                          
      </div>                                                                                                            
    )                                                                                                                
  }
  