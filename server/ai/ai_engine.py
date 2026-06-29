#!pip install transformers pillow tqdm requests faiss-cpu
import os
import json
from pyexpat import features
import time
import torch
import random
import numpy as np
from PIL import Image
from io import BytesIO
from tqdm import tqdm
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset, DataLoader
from transformers import CLIPProcessor, CLIPModel
from torch.optim import AdamW
import torch.nn.functional as F
import requests
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from transformers import AutoTokenizer as NLLBTokenizer
from transformers import AutoModelForSeq2SeqLM


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Device:", device)

clip_processor = CLIPProcessor.from_pretrained(r"C:\GraduationProject\webProject_GP_Final\GP\lokalmatch\clip_model")
clip_model = CLIPModel.from_pretrained(r"C:\GraduationProject\webProject_GP_Final\GP\lokalmatch\clip_model").to(device)

clip_model.eval()


# Load embeddings and URLs
image_embeddings = np.load(r"C:\GraduationProject\webProject_GP_Final\GP\lokalmatch\clip_model\image_embeddings (2).npy")   # shape: (N, dim)
text_embeddings = np.load(r"C:\GraduationProject\webProject_GP_Final\GP\lokalmatch\clip_model\text_embeddings (2).npy")     # if needed
all_image_urls = []
with open(r"C:\GraduationProject\webProject_GP_Final\GP\lokalmatch\clip_model\image_urls (2).jsonl", "r", encoding="utf-8") as f:
    for line in f:
        url = line.strip().strip('"')   # removes "quotes"
        all_image_urls.append(url)




# Verify shapes
print("Image embeddings:", image_embeddings.shape)
print("Text embeddings:", text_embeddings.shape if 'text_embeddings' in locals() else "N/A")
print("URLs count:", len(all_image_urls))



#!pip install torch torchvision transformers faiss-cpu pillow requests
import faiss
embedding_dim = image_embeddings.shape[1]

index = faiss.IndexFlatIP(embedding_dim)  # cosine similarity (normalized vectors)
index.add(image_embeddings)

print(f"FAISS index built with {index.ntotal} vectors.")


from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# qwen_name = "Qwen/Qwen2-1.5B-Instruct"

# tokenizer_qwen = AutoTokenizer.from_pretrained(qwen_name)
# model_qwen = AutoModelForCausalLM.from_pretrained(qwen_name).to(device)

# def process_query(text):
#     arabic, english = split_text(text)

#     # Step 1: fast mapping (VERY IMPORTANT)
#     arabic = normalize_fashion_terms(arabic)

#     # Step 2: combine
#     combined = (english + " " + arabic).strip()

#     # Step 3: if still Arabic → use Qwen
#     if contains_arabic(combined):
#         combined = translate_query(combined)

#     return combined


# def translate_query(text):
#     prompt = f"Translate to short English fashion keywords (max 5 words): {text}"

#     inputs = tokenizer_qwen(prompt, return_tensors="pt").to(device)

#     with torch.no_grad():
#         outputs = model_qwen.generate(
#             **inputs,
#             max_new_tokens=15,
#             do_sample=False
#         )

#     result = tokenizer_qwen.decode(outputs[0], skip_special_tokens=True)

#     return result.strip()


helsinki_name = "Helsinki-NLP/opus-mt-ar-en"

tokenizer_helsinki = AutoTokenizer.from_pretrained(helsinki_name)
model_helsinki = AutoModelForSeq2SeqLM.from_pretrained(
    helsinki_name
).to(device)

model_helsinki.eval()

FASHION_MAP = {
    #  Headwear
    "طرحة": "hijab",
    "حجاب": "hijab",
    "ايشارب": "scarf",
    "سكارف": "scarf",
    "توربان": "turban",
     "طرحه": "hijab",

    #  Tops
    "تيشيرت": "t-shirt",
    "تيشرت": "t-shirt",
    "تشيرت": "t-shirt",
    "بلوزة": "blouse",
    "قميص": "shirt",
    "هودي": "hoodie",
    "سويت شيرت": "sweatshirt",
    "بلوفر": "sweater",
    "كارديجان": "cardigan",
    "جاكيت": "jacket",
    "چاكيت": "jacket",
    "قميص" : "chemise",
    

    #  Dresses
    "فستان":"dress",
    "فستان سواريه": "evening dress",
    "سواريه": "evening dress",
    "فستان سهره": "evening dress",
    "فستان خطوبة": "engagement dress",
    "فستان فرح": "wedding dress",

    #  Bottoms
    "بنطلون": "pants",
    "بنطلون جينز": "jeans",
    "جينز": "jeans",
    "سكيني": "skinny jeans",
    "واسع": "wide pants",
    "جيب": "skirt",
    "جيبه": "skirt",
    "جيبة": "skirt",
    "شورت": "shorts",

    #  Shoes
    "كوتشي": "sneakers",
    "جزمة": "shoes",
    "بوت": "boots",
    "صندل": "sandals",
    "شبشب": "slippers",
    "كعب": "heels",

    #  Accessories
    "شنطة": "bag",
    "شنطه": "bag",
    "حقيبة": "bag",
    "نضارة": "sunglasses",
    "نظارة": "sunglasses",
    "سلسلة": "necklace",
    "خاتم": "ring",

    #  Colors (VERY IMPORTANT for search)
    "ابيض": "white",
    "بيضه": "white",
    "اسود": "black",
    "سودا": "black",
    "احمر": "red",
    "ازرق": "blue",
    "كحلي": "navy",
    "اخضر": "green",
    "اصفر": "yellow",
    "بيج": "beige",
    "بني": "brown",
    "رمادي": "gray",
    "موف": "purple",
    "روز": "pink",
    "لبني": "light blue",
    "بينك": "pink",

    #  Styles / fits
    "واسع": "oversized",
    "اوفر سايز": "oversized",
    "ضيق": "tight",
    "كاجوال": "casual",
    "شيك": "elegant",
    "سبور": "sport",
    "كلاسيك": "classic",
    "سادة": "plain",
    "مقلم": "striped",
    "مشجر": "floral",
    "نص كم" : "short sleeve",
    "بكم" : "long sleeve",

    #  Materials
    "قطن": "cotton",
    "جينز": "denim",
    "جلد": "leather",
    "صوف": "wool",
    "كتان" : "linen",
    "للبنات": "for girls",
    "للمحجبات": "for hijab",
    "للسيدات": "for women ",

    #  Occasions
    "خروج": "casual outfit",
    "سهره": "evening",
    "جامعة": "casual",
    "شغل": "formal",
}


import re

def contains_arabic(text):
    return bool(re.search(r'[\u0600-\u06FF]', text))



def direct_map_fashion_terms(text):

    for ar in sorted(
        FASHION_MAP.keys(),
        key=len,
        reverse=True
    ):
        text = text.replace(ar, FASHION_MAP[ar])

    return text




@torch.no_grad()
def translate_remaining_arabic(text):

    if not contains_arabic(text):
        return text

    inputs = tokenizer_helsinki(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128
    ).to(device)

    outputs = model_helsinki.generate(
        **inputs,
        max_new_tokens=40
    )

    translated = tokenizer_helsinki.decode(
        outputs[0],
        skip_special_tokens=True
    )

    return translated



def process_query(query):

    query = query.strip()

    # English query => DON'T TOUCH
    if not contains_arabic(query):
        return query

    # Step 1
    query = direct_map_fashion_terms(query)

    # Step 2
    if contains_arabic(query):
        query = translate_remaining_arabic(query)

    return query.lower().strip()







# @torch.no_grad()
# def normalize_fashion_terms(text):
#     for ar, en in FASHION_MAP.items():
#         if ar in text:
#             text = text.replace(ar, en)
#     return text


# """ def normalize_egyptian_to_formal(text):
#     prompt = f
# Convert Egyptian Arabic fashion text into formal Arabic.

# Text: {text}
# Formal Arabic:


#     inputs = tokenizer_qwen(prompt, return_tensors="pt").to(device)

#     with torch.no_grad():
#         outputs = model_qwen.generate(
#             **inputs,
#             max_new_tokens=30,
#             do_sample=False,
#             eos_token_id=tokenizer_qwen.eos_token_id
#         )

#     result = tokenizer_qwen.decode(outputs[0], skip_special_tokens=True)

#     # extract only answer
#     if "Formal Arabic:" in result:
#         result = result.split("Formal Arabic:")[-1]

#     return result.strip()

#  """


import torch
from transformers import CLIPProcessor, CLIPModel
import time
def search_text(query_text, top_k=50):

    # start = time.perf_counter() if measure_time else None

    # Arabic support
    query_text = process_query(query_text)

    print("Processed Query:", query_text)

    inputs = clip_processor(
        text=[query_text],
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():

        out = clip_model.get_text_features(
            inputs["input_ids"],
            inputs["attention_mask"]
        )
        # print("search_text:", type(q))

        # FashionCLIP compatibility
        if isinstance(out, torch.Tensor):
            q = out

        elif hasattr(out, "pooler_output") and out.pooler_output is not None:
            q = out.pooler_output

        elif hasattr(out, "last_hidden_state"):
            q = out.last_hidden_state.mean(dim=1)

        else:
            raise ValueError(
                f"Unsupported output type: {type(out)}"
            )

        q = q / (q.norm(p=2, dim=-1, keepdim=True) + 1e-8)

    q = q.cpu().numpy().astype("float32")

    D, I = index.search(q, top_k)
    semantic_correct = np.sum(D[0][:10] >= 0.85)
    semantic_recall = semantic_correct / 10

    print(f"Semantic Matches: {semantic_correct}/10")
    print(f"Semantic Recall@10: {semantic_recall:.2%}")
    print("Text Avg Similarity:", np.mean(D[0]))
    top1_score = D[0][0]
    top10_avg = np.mean(D[0][:10])

    print("Top-1 Similarity:", top1_score)
    print("Top-10 Similarity:", top10_avg)

    results = []

    for idx in I[0]:
        if 0 <= idx < len(all_image_urls):
            results.append(all_image_urls[idx])

   
    return results


def search_by_image(query_image_pil, top_k=50):
    # start = time.perf_counter() if measure_time else None
    clip_model.eval()

    inputs = clip_processor(
        images=[query_image_pil],
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        out = clip_model.get_image_features(inputs["pixel_values"])

        # If the model returns an object instead of a tensor
        if not isinstance(out, torch.Tensor):
            if hasattr(out, "pooler_output"):
                img_emb = out.pooler_output
            else:
                img_emb = out.last_hidden_state.mean(dim=1)
        else:
            img_emb = out

        img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)
        img_emb = img_emb.cpu().numpy().astype("float32")
   
    D, I = index.search(img_emb, top_k)
    semantic_correct = np.sum(D[0][:10] >= 0.878)
    semantic_recall = semantic_correct / 10

    print(f"Semantic Matches: {semantic_correct}/10")
    print(f"Semantic Recall@10: {semantic_recall:.2%}")
    print("Text Avg Similarity:", np.mean(D[0]))
    top1_score = D[0][0]
    top10_avg = np.mean(D[0][:10])
    for i, score in enumerate(D[0][:10], 1):
        print(f"{i}: {score:.4f}")

    print("Top-1 Similarity:", top1_score)
    print("Top-10 Similarity:", top10_avg)
    results = [all_image_urls[i] for i in I[0]]

    # if measure_time:
    #     elapsed = time.perf_counter() - start
    #     return results, elapsed

    return results






# def search_text(query, top_k=20):
#     query = process_query(query)

#     inputs = clip_processor(text=[query], return_tensors="pt").to(device)

#     with torch.no_grad():
#         outputs = clip_model.get_text_features(**inputs)

#         if hasattr(outputs, "pooler_output"):
#             features = outputs.pooler_output
#         else:
#             features = outputs

#     features = features / (features.norm(dim=-1, keepdim=True) + 1e-8)
#     features = features.cpu().numpy().astype("float32")

#     #faiss.normalize_L2(features)

#     D, I = index.search(features, top_k)
#     print("Text Avg Similarity:", np.mean(D[0]))
#     top1_score = D[0][0]
#     top5_avg = np.mean(D[0][:5])

#     print("Top-1 Similarity:", top1_score)
#     print("Top-5 Similarity:", top5_avg)


#     return [all_image_urls[i] for i in I[0]]


# # ai_engine.py

# def search(query: str, top_k=20):
#     query = process_query(query)

#     inputs = clip_processor(text=[query], return_tensors="pt").to(device)

#     with torch.no_grad():
#         out = clip_model.get_text_features(
#             inputs["input_ids"],
#             inputs["attention_mask"]
#         )
        
#         if hasattr(out, "pooler_output"):
#             q = out.pooler_output
#         else:
#             q = out.last_hidden_state.mean(dim=1)

#         q = q / q.norm(p=2, dim=-1, keepdim=True)

#     q = q.cpu().numpy().astype("float32")

#     D, I = index.search(q, top_k)
#     print("Text Avg Similarity:", np.mean(D[0]))
#     top1_score = D[0][0]
#     top5_avg = np.mean(D[0][:5])

#     print("Top-1 Similarity:", top1_score)
#     print("Top-5 Similarity:", top5_avg)

#     results = []
#     for idx in I[0]:
#         if 0 <= idx < len(all_image_urls):
#             results.append(all_image_urls[idx])


#     return results




# import torch
# from transformers import CLIPProcessor, CLIPModel
# import time
# def search_text(query_text, top_k=5,measure_time=True):
#     start = time.perf_counter() if measure_time else None
#     inputs = clip_processor(text=[query_text], return_tensors="pt").to(device)

#     with torch.no_grad():
#         out = clip_model.get_text_features(
#             inputs["input_ids"],
#             inputs["attention_mask"]
#         )

#         # New fix: extract the actual embedding tensor
#         if hasattr(out, "pooler_output"):
#             q = out.pooler_output
#         else:
#             q = out.last_hidden_state.mean(dim=1)

#         q = q / q.norm(p=2, dim=-1, keepdim=True)

#     q = q.cpu().numpy().astype("float32")

#     D, I = index.search(q, top_k)

#     results = []
#     for idx in I[0]:
#         if 0 <= idx < len(all_image_urls):
#             results.append(all_image_urls[idx])

#     if measure_time:
#         elapsed = time.perf_counter() - start
#         return results, elapsed
        
#     return results


# def search_by_image(query_image_pil, top_k=20,measure_time=True):
#     start = time.perf_counter() if measure_time else None
#     clip_model.eval()

#     inputs = clip_processor(
#         images=[query_image_pil],
#         return_tensors="pt"
#     ).to(device)

#     with torch.no_grad():
#         out = clip_model.get_image_features(inputs["pixel_values"])

#         # If the model returns an object instead of a tensor
#         if not isinstance(out, torch.Tensor):
#             if hasattr(out, "pooler_output"):
#                 img_emb = out.pooler_output
#             else:
#                 img_emb = out.last_hidden_state.mean(dim=1)
#         else:
#             img_emb = out

#         img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)
#         img_emb = img_emb.cpu().numpy().astype("float32")

#     D, I = index.search(img_emb, top_k)
#     print("Text Avg Similarity:", np.mean(D[0]))
#     top1_score = D[0][0]
#     top5_avg = np.mean(D[0][:5])

#     print("Top-1 Similarity:", top1_score)
#     print("Top-5 Similarity:", top5_avg)

#     results = [all_image_urls[i] for i in I[0]]

#     if measure_time:
#         elapsed = time.perf_counter() - start
#         return results, elapsed

#     return results









# import re

# def contains_arabic(text):
#     return any('\u0600' <= c <= '\u06FF' for c in text)

# def split_text(text):
#     arabic_part = re.findall(r'[\u0600-\u06FF\s]+', text)
#     english_part = re.sub(r'[\u0600-\u06FF\s]+', '', text)

#     return " ".join(arabic_part).strip(), english_part.strip()

# def clean_query(text):
#     return " ".join(list(set(text.split())))

# def is_english(text):
#     return all(ord(c) < 128 for c in text)


# @torch.no_grad()
# def normalize_fashion_terms(text):
#     for ar, en in FASHION_MAP.items():
#         if ar in text:
#             text = text.replace(ar, en)
#     return text

# def translate_query(text):
#     inputs = tokenizer_helsinki(text, return_tensors="pt", padding=True, truncation=True).to(device)

#     with torch.no_grad():
#         outputs = model_helsinki.generate(
#             **inputs,
#             max_new_tokens=20
#         )

#     translated = tokenizer_helsinki.decode(outputs[0], skip_special_tokens=True)
#     return translated.lower()

# def process_query(text):
#     arabic, english = split_text(text)

#     arabic = normalize_fashion_terms(arabic)

#     combined = (english + " " + arabic).strip()

#     if contains_arabic(combined):
#         combined = translate_query(combined)
#         print("Translated Query:", combined)

#     return combined  

# def process_query(text):
#     arabic, english = split_text(text)

#     if arabic:
#         # Step 1: apply mapping (VERY IMPORTANT)
#         mapped_arabic = normalize_fashion_terms(arabic)

#         # Step 2: generate short English query from FULL text
#         short_query = generate_search_query(mapped_arabic)

#         # Step 3: FORCE important keywords to stay
#         for en_word in FASHION_MAP.values():
#             if en_word in mapped_arabic and en_word not in short_query:
#                 short_query = en_word + " " + short_query

#         final_query = f"{english} {short_query}".strip()

#     else:
#         final_query = generate_search_query(english)

#     return clean_query(final_query)









# def generate_search_query(text):
#     prompt = f"""
# Convert this into a short English fashion search query (max 5 words only).

# Text: {text}
# Query:
# """

#     inputs = tokenizer_qwen(prompt, return_tensors="pt").to(device)

#     with torch.no_grad():
#         outputs = model_qwen.generate(
#             **inputs,
#             max_new_tokens=15,
#             do_sample=False,
#             eos_token_id=tokenizer_qwen.eos_token_id
#         )

#     result = tokenizer_qwen.decode(outputs[0], skip_special_tokens=True)

#     if "Query:" in result:
#         result = result.split("Query:")[-1]

#     return result.strip()


def search_multimodal(query_image_pil, query_text, top_k=50):

    clip_model.eval()

    # =========================
    # TEXT (IDENTICAL TO search_text)
    # =========================
    query_text = process_query(query_text)

    # print("Processed Query:", query_text)

    text_inputs = clip_processor(
        text=[query_text],
        return_tensors="pt",
        padding=True,
        truncation=True
    ).to(device)

    with torch.no_grad():

        out = clip_model.get_text_features(
            text_inputs["input_ids"],
            text_inputs["attention_mask"]
        )
    
        if isinstance(out, torch.Tensor):
            text_features = out
    
        elif hasattr(out, "pooler_output") and out.pooler_output is not None:
            text_features = out.pooler_output
    
        elif hasattr(out, "last_hidden_state"):
            text_features = out.last_hidden_state.mean(dim=1)
    
        else:
            raise ValueError(
                f"Unsupported output type: {type(out)}"
            )
    
        text_features = text_features / (
            text_features.norm(p=2, dim=-1, keepdim=True) + 1e-8
        )
    # =========================
    # IMAGE (IDENTICAL STYLE)
    # =========================
    image_inputs = clip_processor(
        images=[query_image_pil],
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():

        out = clip_model.get_image_features(
            image_inputs["pixel_values"]
        )
    
        if isinstance(out, torch.Tensor):
            image_features = out
    
        elif hasattr(out, "pooler_output") and out.pooler_output is not None:
            image_features = out.pooler_output
    
        elif hasattr(out, "last_hidden_state"):
            image_features = out.last_hidden_state.mean(dim=1)
    
        else:
            raise ValueError(
                f"Unsupported output type: {type(out)}"
            )
    
        image_features = image_features / (
            image_features.norm(p=2, dim=-1, keepdim=True) + 1e-8
        )
    # =========================
    # FUSION
    # =========================
    text_weight = 0.7
    image_weight = 0.3

    combined = (
        text_weight * text_features +
        image_weight * image_features
    )

    combined = combined / combined.norm()

    # =========================
    # FAISS SEARCH
    # =========================
    # query = combined.unsqueeze(0).cpu().numpy().astype("float32")
    query = combined.cpu().numpy().astype("float32").reshape(1, -1)
    D, I = index.search(query, top_k)
    semantic_correct = np.sum(D[0][:10] >= 0.81)
    semantic_recall = semantic_correct / 10

    print(f"Semantic Matches: {semantic_correct}/10")
    print(f"Semantic Recall@10: {semantic_recall:.2%}")
    print("Text Avg Similarity:", np.mean(D[0]))
    top1_score = D[0][0]
    top10_avg = np.mean(D[0][:10])

    print("Top-1 Similarity:", top1_score)
    print("Top-10 Similarity:", top10_avg)
    print(combined.shape)

    print(query.shape)
    results = []

    for idx in I[0]:
        if 0 <= idx < len(all_image_urls):
            results.append(all_image_urls[idx])

    return results



# def search_multimodal(query_image_pil, query_text, top_k=20):
#     clip_model.eval()

#     # TEXT EMBEDDING
#     processed_text = process_query(query_text)

#     text_inputs = clip_processor(
#         text=[processed_text],
#         return_tensors="pt",
#         padding=True
#     ).to(device)

#     with torch.no_grad():
#         text_out = clip_model.get_text_features(**text_inputs)
#         text_features = text_out if isinstance(text_out, torch.Tensor) else text_out.pooler_output

#     text_features = torch.nn.functional.normalize(text_features, dim=-1).squeeze(0)

#     # IMAGE EMBEDDING
#     image_inputs = clip_processor(
#         images=[query_image_pil],
#         return_tensors="pt"
#     ).to(device)

#     with torch.no_grad():
#         image_out = clip_model.get_image_features(**image_inputs)
#         image_features = image_out if isinstance(image_out, torch.Tensor) else image_out.pooler_output

#     image_features = torch.nn.functional.normalize(image_features, dim=-1).squeeze(0)

   
#     # FUSION 
#     text_weight = 0.7
#     image_weight = 0.3

#     combined = (text_features * text_weight) + (image_features * image_weight)
#     combined = torch.nn.functional.normalize(combined, dim=0)

    
#     # FAISS 
   
#     query = combined.unsqueeze(0).cpu().numpy().astype("float32")

#     D, I = index.search(query, top_k)
#     print("Text Avg Similarity:", np.mean(D[0]))
#     top1_score = D[0][0]
#     top5_avg = np.mean(D[0][:5])

#     print("Top-1 Similarity:", top1_score)
#     print("Top-5 Similarity:", top5_avg)
    
#     results = [
#         all_image_urls[i]
#         for i in I[0]
#         if 0 <= i < len(all_image_urls)
#     ]

#     return results