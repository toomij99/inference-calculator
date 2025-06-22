import React, { useState, useEffect } from 'react';
import { Calculator, Cpu, HardDrive, DollarSign, Clock, Info } from 'lucide-react';

const LlamaInferenceCalculator = () => {
  const [config, setConfig] = useState({
    modelSize: 70, // billion parameters
    sequenceLength: 2048,
    batchSize: 1,
    numGpus: 2,
    gpuType: 'A100-80GB',
    precision: 16,
    gpuCostPerHour: 2.21, // per GPU
    promptTokens: 1000,
    completionTokens: 500
  });

  const [results, setResults] = useState({});

  // GPU specifications
  const gpuSpecs = {
    'A100-80GB': {
      memory: 80, // GB
      memoryBandwidth: 2.0, // TB/s theoretical
      memoryBandwidthEffective: 1.3, // TB/s practical (65% efficiency)
      computeThroughput: 312, // TFLOPS theoretical
      computeThroughputEffective: 200 // TFLOPS practical (~64% MFU)
    },
    'H100-80GB': {
      memory: 80,
      memoryBandwidth: 3.35,
      memoryBandwidthEffective: 2.2,
      computeThroughput: 989,
      computeThroughputEffective: 630
    }
  };

  useEffect(() => {
    calculateInference();
  }, [config]);

  const calculateInference = () => {
    const { modelSize, sequenceLength, batchSize, numGpus, gpuType, precision, gpuCostPerHour, promptTokens, completionTokens } = config;
    const gpu = gpuSpecs[gpuType];
    
    // Model parameters (in billions)
    const modelParams = modelSize;
    
    // Memory requirements
    const modelWeightsGB = (modelParams * precision) / 8; // Convert bits to GB
    const kvCachePerTokenMB = (modelSize === 70) ? 0.41 : (modelSize / 70) * 0.41; // Scale based on model size
    const kvCacheTotalGB = (kvCachePerTokenMB * sequenceLength * batchSize) / 1024;
    
    // Total memory needed
    const totalMemoryGB = modelWeightsGB + kvCacheTotalGB;
    const totalGpuMemory = gpu.memory * numGpus;
    const memoryUtilization = (totalMemoryGB / totalGpuMemory) * 100;
    
    // Compute requirements (FLOPs)
    const flopsPerToken = 2 * modelParams * 1e9; // 2N FLOPs per token
    const promptFlops = flopsPerToken * promptTokens;
    const completionFlops = flopsPerToken * completionTokens;
    
    // Throughput calculations
    const totalComputeThroughput = gpu.computeThroughputEffective * numGpus * 1e12; // Convert to FLOPS
    const totalMemoryBandwidth = gpu.memoryBandwidthEffective * numGpus * 1e12; // Convert to B/s
    
    // Prompt processing (compute-bound)
    const promptProcessingTime = promptFlops / totalComputeThroughput;
    const promptTokensPerSecond = promptTokens / promptProcessingTime;
    
    // Token generation (memory-bound)
    const memoryPerToken = modelWeightsGB * 1e9 + kvCachePerTokenMB * batchSize * 1e6; // bytes
    const generationTokensPerSecond = (totalMemoryBandwidth / memoryPerToken) * batchSize;
    const completionTime = completionTokens / generationTokensPerSecond;
    
    // Cost calculations
    const totalTime = promptProcessingTime + completionTime;
    const costPerSecond = (gpuCostPerHour * numGpus) / 3600;
    const totalCost = costPerSecond * totalTime;
    
    // Per-token costs
    const promptCostPer1k = (costPerSecond * promptProcessingTime * 1000) / promptTokens;
    const completionCostPer1k = (costPerSecond * completionTime * 1000) / completionTokens;
    
    // Batch size optimization
    const maxBatchSize = Math.floor((totalGpuMemory - modelWeightsGB) / (kvCacheTotalGB / batchSize));
    const optimalBatchSize = Math.min(maxBatchSize, 64); // Practical limit for latency
    
    // Comparison with GPT-3.5 pricing
    const gpt35PromptCost = 0.0015; // $0.0015 per 1k tokens
    const gpt35CompletionCost = 0.002; // $0.002 per 1k tokens
    
    setResults({
      modelWeightsGB: modelWeightsGB.toFixed(1),
      kvCacheTotalGB: kvCacheTotalGB.toFixed(2),
      totalMemoryGB: totalMemoryGB.toFixed(1),
      memoryUtilization: memoryUtilization.toFixed(1),
      promptProcessingTime: (promptProcessingTime * 1000).toFixed(0), // ms
      completionTime: completionTime.toFixed(2),
      promptTokensPerSecond: promptTokensPerSecond.toFixed(0),
      generationTokensPerSecond: generationTokensPerSecond.toFixed(1),
      totalTime: totalTime.toFixed(2),
      totalCost: (totalCost * 1000).toFixed(3), // in cents
      promptCostPer1k: promptCostPer1k.toFixed(4),
      completionCostPer1k: completionCostPer1k.toFixed(4),
      maxBatchSize: maxBatchSize,
      optimalBatchSize: optimalBatchSize,
      gpt35Comparison: {
        promptSavings: ((gpt35PromptCost - promptCostPer1k) / gpt35PromptCost * 100).toFixed(1),
        completionSavings: ((gpt35CompletionCost - completionCostPer1k) / gpt35CompletionCost * 100).toFixed(1)
      }
    });
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || value
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <Calculator className="text-blue-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Llama Inference Calculator</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Configuration</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Model Size (B params)</label>
                <select 
                  value={config.modelSize}
                  onChange={(e) => handleInputChange('modelSize', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={7}>Llama-2-7B</option>
                  <option value={13}>Llama-2-13B</option>
                  <option value={70}>Llama-2-70B</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">GPU Type</label>
                <select 
                  value={config.gpuType}
                  onChange={(e) => handleInputChange('gpuType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A100-80GB">A100-80GB</option>
                  <option value="H100-80GB">H100-80GB</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Number of GPUs</label>
                <input 
                  type="number" 
                  value={config.numGpus}
                  onChange={(e) => handleInputChange('numGpus', e.target.value)}
                  min="1" 
                  max="8"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Batch Size</label>
                <input 
                  type="number" 
                  value={config.batchSize}
                  onChange={(e) => handleInputChange('batchSize', e.target.value)}
                  min="1" 
                  max="128"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Sequence Length</label>
                <input 
                  type="number" 
                  value={config.sequenceLength}
                  onChange={(e) => handleInputChange('sequenceLength', e.target.value)}
                  min="256" 
                  max="8192"
                  step="256"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Precision (bits)</label>
                <select 
                  value={config.precision}
                  onChange={(e) => handleInputChange('precision', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={8}>8-bit (Quantized)</option>
                  <option value={16}>16-bit (Half)</option>
                  <option value={32}>32-bit (Full)</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Prompt Tokens</label>
                <input 
                  type="number" 
                  value={config.promptTokens}
                  onChange={(e) => handleInputChange('promptTokens', e.target.value)}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Completion Tokens</label>
                <input 
                  type="number" 
                  value={config.completionTokens}
                  onChange={(e) => handleInputChange('completionTokens', e.target.value)}
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">GPU Cost ($/hr)</label>
                <input 
                  type="number" 
                  value={config.gpuCostPerHour}
                  onChange={(e) => handleInputChange('gpuCostPerHour', e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Results Panel */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Results</h2>
            
            {/* Memory Usage */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="text-blue-600" size={20} />
                <h3 className="font-semibold text-blue-800">Memory Usage</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Model Weights:</span>
                  <span className="font-semibold ml-2">{results.modelWeightsGB} GB</span>
                </div>
                <div>
                  <span className="text-gray-600">KV Cache:</span>
                  <span className="font-semibold ml-2">{results.kvCacheTotalGB} GB</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Memory:</span>
                  <span className="font-semibold ml-2">{results.totalMemoryGB} GB</span>
                </div>
                <div>
                  <span className="text-gray-600">Memory Usage:</span>
                  <span className={`font-semibold ml-2 ${parseFloat(results.memoryUtilization) > 90 ? 'text-red-600' : 'text-green-600'}`}>
                    {results.memoryUtilization}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Performance */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="text-green-600" size={20} />
                <h3 className="font-semibold text-green-800">Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Prompt Speed:</span>
                  <span className="font-semibold ml-2">{results.promptTokensPerSecond} tok/s</span>
                </div>
                <div>
                  <span className="text-gray-600">Generation Speed:</span>
                  <span className="font-semibold ml-2">{results.generationTokensPerSecond} tok/s</span>
                </div>
                <div>
                  <span className="text-gray-600">Time to First Token:</span>
                  <span className="font-semibold ml-2">{results.promptProcessingTime} ms</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Time:</span>
                  <span className="font-semibold ml-2">{results.totalTime} s</span>
                </div>
              </div>
            </div>
            
            {/* Cost Analysis */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="text-yellow-600" size={20} />
                <h3 className="font-semibold text-yellow-800">Cost Analysis</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Prompt Cost:</span>
                  <span className="font-semibold ml-2">${results.promptCostPer1k}/1k tok</span>
                </div>
                <div>
                  <span className="text-gray-600">Completion Cost:</span>
                  <span className="font-semibold ml-2">${results.completionCostPer1k}/1k tok</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Request Cost:</span>
                  <span className="font-semibold ml-2">{results.totalCost}¢</span>
                </div>
                <div>
                  <span className="text-gray-600">Max Batch Size:</span>
                  <span className="font-semibold ml-2">{results.maxBatchSize}</span>
                </div>
              </div>
            </div>
            
            {/* GPT-3.5 Comparison */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="text-purple-600" size={20} />
                <h3 className="font-semibold text-purple-800">vs GPT-3.5 Turbo</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Prompt Savings:</span>
                  <span className={`font-semibold ml-2 ${parseFloat(results.gpt35Comparison?.promptSavings) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.gpt35Comparison?.promptSavings}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Completion Savings:</span>
                  <span className={`font-semibold ml-2 ${parseFloat(results.gpt35Comparison?.completionSavings) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.gpt35Comparison?.completionSavings}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold text-indigo-800 mb-2">Recommendations</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {parseFloat(results.gpt35Comparison?.promptSavings) > 0 && (
                  <div className="text-green-700">✓ Great for prompt-heavy tasks (classification, reranking)</div>
                )}
                {parseFloat(results.gpt35Comparison?.completionSavings) < 0 && (
                  <div className="text-red-700">⚠ More expensive than GPT-3.5 for completions</div>
                )}
                {parseFloat(results.memoryUtilization) > 90 && (
                  <div className="text-orange-700">⚠ High memory usage - consider more GPUs</div>
                )}
                {config.batchSize < results.optimalBatchSize && (
                  <div className="text-blue-700">💡 Increase batch size to {results.optimalBatchSize} for better efficiency</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> This calculator is based on the analysis from Cursor's blog post on Llama inference characteristics. 
            Results are estimates and actual performance may vary based on implementation details, hardware configuration, and optimization techniques.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LlamaInferenceCalculator;