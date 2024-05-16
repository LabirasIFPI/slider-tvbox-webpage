import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { IImage } from "../models/image";
import { firestore, storage } from "../config/firebase-config";
import {
  StorageError,
  StorageReference,
  UploadTask,
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

async function createDocument(image: IImage) {
  const documentReference = doc(firestore, "images", image.id);

  // uploadBytes(imageRef, image.blob).then((snapshot) => {
  //   console.log(snapshot.ref.fullPath);
  // });

  // const timeStamp = Timestamp.fromDate(new Date());

  new Promise((resolve, reject) =>
    setTimeout(
      () =>
        resolve(
          setDoc(documentReference, {
            ...image,
            updatedAt: Timestamp.fromDate(new Date()),
          } as IImage)
        ),
      500
    )
  );
}

async function createManyDocuments(images: IImage[]) {
  images.forEach(async (image) => await createDocument(image));
}

async function getElementById(id: string): Promise<IImage> {
  const documentReference = doc(firestore, "images", id);
  //Tem que buscar um elemento pelo id no banco
  const document = await getDoc(documentReference);
  return document.data() as IImage;
}

async function getAllImages(): Promise<IImage[]> {
  const reference = collection(firestore, "images");

  const snapshots = await getDocs(reference);

  const images = snapshots.docs.map((doc) => doc.data()) as IImage[];

  images.sort((a, b) => {
    if (a.updatedAt > b.updatedAt) {
      return 1;
    }

    if (a.updatedAt < b.updatedAt) {
      return -1;
    }

    return 0;
  });

  return images;
}

function uploadImageWithProgress(image: File): UploadTask {
  const storageRef = ref(storage, `images/${image.name}`);

  return uploadBytesResumable(storageRef, image);
}

async function deleteDocumentWithImage(id: string): Promise<void> {
  const document = await getElementById(id);

  await deleteRef(document.name);

  await deleteDocument(document.id);
}

async function downloadUrl(storageRef: StorageReference): Promise<string> {
  return await getDownloadURL(storageRef);
}

async function checkIfImageExists(
  imageName: string
): Promise<boolean | undefined> {
  try {
    const reference = collection(firestore, "images");

    const existImage = query(reference, where("name", "==", imageName));

    const querySnapshot = await getDocs(existImage);

    const data = querySnapshot.docs.map((doc) => doc.data() as IImage);

    if (data.length > 0) {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);

  } catch (error) {
    if (error instanceof StorageError) {
      if (error.code === "storage/object-not-found") {
        return Promise.resolve(false);
      } else {
        return Promise.reject(error);
      }
    }
  }

  // const fileExist = getDownloadURL(storageRef)
  //   .then((url) => {
  //     return true;
  //   })
  //   .catch((error) => {
  //     if (error.code === "storage/object-not-found") {
  //       return false;
  //     } else {
  //       return Promise.reject(error);
  //     }
  //   });

  // return fileExist;
}

async function deleteDocument(id: string): Promise<void> {
  const documentReference = doc(firestore, "images", id);

  await deleteDoc(documentReference);
}

async function deleteRef(name: string): Promise<void> {
  const storageRef = ref(storage, `images/${name}`);

  await deleteObject(storageRef);
}

async function overwriteAllImages(presentImages: IImage[]) {
  const oldImages: IImage[] = await getAllImages();

  oldImages.forEach(async (oldImage) => {
    if (presentImages.find((presentImage) => oldImage.id === presentImage.id)) {
      await deleteDocument(oldImage.id);
      return;
    }

    await deleteDocumentWithImage(oldImage.id);
  });
  await createManyDocuments(presentImages);
}

export const ImageService = {
  createDocument,
  createManyDocuments,
  getAll: getAllImages,
  overwriteAll: overwriteAllImages,
  checkIfImageExists,
  downloadUrl,
  uploadWithProgress: uploadImageWithProgress,
  delete: deleteDocumentWithImage,
};
