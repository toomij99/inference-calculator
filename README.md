# Llama Inference Calculator

This is a web-based calculator to estimate the performance and cost of running inference for Llama models on your own hardware. It helps you understand memory requirements, processing time, and cost-effectiveness compared to commercial APIs.

## How to Use

1.  **Run the application:**
    ```bash
    npm install
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

2.  **Configure the parameters:**
    Use the interactive panel on the left to set up your inference scenario.

    *   **Model Size:** Choose the Llama model you want to simulate (e.g., Llama-2-70B).
    *   **GPU Type:** Select the GPU you are using (e.g., A100-80GB).
    *   **Number of GPUs:** The number of GPUs used for inference.
    *   **Batch Size:** The number of sequences processed in parallel.
    *   **Sequence Length:** The maximum number of tokens in a sequence.
    *   **Prompt Tokens:** The number of tokens in your input prompt.
    *   **Completion Tokens:** The number of tokens you want the model to generate.
    *   **GPU Cost Per Hour:** The cost of renting one GPU for one hour.

3.  **Analyze the results:**
    The results panel on the right will update automatically, showing you key metrics like:
    *   Memory usage (Model Weights, KV Cache).
    *   Performance (Prompt processing time, token generation speed).
    *   Cost analysis (Total cost, cost per 1k tokens).
    *   A comparison of your self-hosting costs versus using a commercial API like GPT-3.5.

## Understanding the Calculations

The calculator is based on established principles for Large Language Model inference:

*   **Memory:** Calculates the space needed for model weights and the KV cache, which stores context for token generation.
*   **Prompt Processing (Prefill):** This phase is typically *compute-bound*. The time taken depends on the raw TFLOPs of the GPU(s).
*   **Token Generation (Decoding):** This phase is typically *memory-bandwidth-bound*. The speed depends on how fast the GPU can read the model weights from its memory.

By adjusting the parameters, you can explore trade-offs between cost, latency, and throughput for your specific use case.
