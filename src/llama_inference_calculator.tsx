import { useState, useEffect } from 'react';
import { Calculator, Info } from 'lucide-react';

interface InferenceConfig {
  modelSize: number;
  sequenceLength: number;
  batchSize: number;
  numGpus: number;
  gpuType: 'A100-80GB' | 'H100-80GB';
  precision: number;
  gpuCostPerHour: number;
  promptTokens: number;
  completionTokens: number;
}

interface Gpt35Comparison {
  promptSavings: string;
  completionSavings: string;
}

interface InferenceResults {
  modelWeightsGB: string;
  kvCacheTotalGB: string;
  totalMemoryGB: string;
  memoryUtilization: string;
  promptProcessingTime: string;
  completionTime: string;
  promptTokensPerSecond: string;
  generationTokensPerSecond: string;
  totalTime: string;
  totalCost: string;
  promptCostPer1k: string;
  completionCostPer1k: string;
  maxBatchSize: number;
  optimalBatchSize: number;
  gpt35Comparison: Gpt35Comparison;
}

const LlamaInferenceCalculator = () => {
  const [config, setConfig] = useState<InferenceConfig>({
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

  const [results, setResults] = useState<InferenceResults | null>(null);

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

  const handleInputChange = (field: keyof InferenceConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: field === 'gpuType' ? value as 'A100-80GB' | 'H100-80GB' : (parseFloat(value) || 0)
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
            
            {!results ? (
              <div className="flex items-center justify-center h-full pt-16">
                <p className="text-gray-500">Calculating...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Throughput */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Throughput</h3>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-2xl font-bold text-blue-600">{results.generationTokensPerSecond}</span>
                      <p className="text-xs text-blue-700">Tokens/sec (Gen)</p>
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-600">{results.promptTokensPerSecond}</span>
                      <p className="text-xs text-blue-700">Tokens/sec (Prompt)</p>
                    </div>
                  </div>
                </div>

                {/* Latency */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Latency</h3>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Prompt: {results.promptProcessingTime} ms</p>
                    <p className="text-sm text-gray-500">Completion: {results.completionTime} s</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">Total: {results.totalTime} s</p>
                  </div>
                </div>

                {/* Cost */}
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Cost Analysis</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <span className="text-lg font-bold text-yellow-700">${results.promptCostPer1k}</span>
                      <p className="text-xs text-yellow-600">/ 1k Prompt</p>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-yellow-700">${results.completionCostPer1k}</span>
                      <p className="text-xs text-yellow-600">/ 1k Completion</p>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-2xl font-bold text-yellow-800">{results.totalCost}¢</span>
                    <p className="text-xs text-yellow-700">Total Request Cost</p>
                  </div>
                </div>
                
                {/* Hardware */}
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-semibold text-indigo-800 mb-2">Hardware Utilization</h3>
                  <p className="text-sm text-gray-600">Max Batch Size: <span className="font-semibold">{results.maxBatchSize}</span></p>
                  <p className="text-sm text-gray-600">Total Memory: {results.totalMemoryGB} GB</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${results.memoryUtilization}%` }}></div>
                  </div>
                  <p className="text-xs text-right text-indigo-700">{results.memoryUtilization}% Memory Util.</p>
                </div>
                
                {/* Comparison */}
                <div className="p-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-2">vs. GPT-3.5-Turbo</h3>
                  <div className="flex justify-around items-center text-center">
                    <div>
                      <p className={`text-xl font-bold ${parseFloat(results.gpt35Comparison.promptSavings) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {results.gpt35Comparison.promptSavings}%
                      </p>
                      <p className="text-xs text-gray-500">Prompt Savings</p>
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${parseFloat(results.gpt35Comparison.completionSavings) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {results.gpt35Comparison.completionSavings}%
                      </p>
                      <p className="text-xs text-gray-500">Completion Savings</p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-2 text-center flex items-center justify-center gap-2">
                  <Info size={14} />
                  <span>Optimal batch size for latency is <span className="font-bold">{results.optimalBatchSize}</span>. Higher batch sizes increase throughput but also latency.</span>
                </div>
              </div>
            )}
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