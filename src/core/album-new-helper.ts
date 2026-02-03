import {PageTemplate} from "./types/album/PageTemplate";
import {MaxMinPhoto} from "./types/MaxMinPhotoInfo";
import {Photo} from "./types/album/Photo";
import {Orientation, PhotosPerSpread, Position} from "./Constants";
import {Album} from "./types/album/Album";
import {Page} from "./types/album/Page";
import { v4 as uuidv4 } from "uuid";
import {Frame} from "./types/album/Frame";

type TemplateHistoryItem = {
    template: PageTemplate;
    count: number;
};

export function GetRecommendedImagesInAlbum(activeProject: Album | null) {
    if(!activeProject)
        return  0;
    if(activeProject.template.maxSpreadsCount <= 12){
        return 24
    }
    if(activeProject.template.maxSpreadsCount <= 25){
        return 40
    }
    return 50;
}
export function GetMinImagesInAlbum(activeProject: Album | null) {
    if(!activeProject)
        return  0;

    return activeProject.template.minSpreadsCount * 2
}
export function GetMaxImagesInAlbum(activeProject: Album | null) {

    if(!activeProject || !activeProject.template)
        return 0

  //  if (!activeProject)
    if(activeProject.template.maxSpreadsCount <=10)
        return 32;
    if(activeProject.template.maxSpreadsCount <=15)
        return activeProject.template.maxSpreadsCount * 4;
    if(activeProject.template.maxSpreadsCount <=25)
       return activeProject.template.maxSpreadsCount * 5;
    if(activeProject.template.maxSpreadsCount <=40)
        return activeProject.template.maxSpreadsCount * 6;
    if(activeProject.template.maxSpreadsCount <=49)
        return activeProject.template.maxSpreadsCount * 7;
    return 380;
  //  return activeProject.template.maxSpreadsCount * 2 *
   //     activeProject.template.pageTemplates.reduce((a, b) =>
    //        (a.photoFrames.filter(e => e.type == 1).length > b.photoFrames.filter(e => e.type == 1).length ? a : b)).photoFrames.filter(e => e.type == 1).length
}

export function GetAlbumTemplates(activeProject: Album | null) {



    if (activeProject) {


        switch (activeProject.photosPerPage) {
            case PhotosPerSpread.LOW:
                return  activeProject.template.pageTemplates.filter(e => e.photoFrames.length <= 2)
            case PhotosPerSpread.MEDUIM:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 3 && e.photoFrames.length <= 5)
            case PhotosPerSpread.HIGH:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 6)
        }
    }
    return  []
}
export function GetSmallTemplates(activeProject: Album | null, photosPerPage: PhotosPerSpread) {
    if (activeProject) {
        switch (photosPerPage) {
            case PhotosPerSpread.LOW:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length < 2)
            case PhotosPerSpread.MEDUIM:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length < 3)
            case PhotosPerSpread.HIGH:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length < 5)
        }
    }
    return  []
}
export function GetTemplates(activeProject: Album | null, photosPerPage: PhotosPerSpread) {
    if (activeProject) {
        switch (photosPerPage) {
            case PhotosPerSpread.LOW:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length <= 3)
            case PhotosPerSpread.MEDUIM:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 2 && e.photoFrames.length <= 4)
            case PhotosPerSpread.POSTMEDIUM:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 4 && e.photoFrames.length <= 5)
            case PhotosPerSpread.HIGH:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 6)
            case PhotosPerSpread.PREHIGH:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length >= 3 && e.photoFrames.length <= 5)
        }
    }
    return  []
}
export function GetAlbumExrTemplates(activeProject: Album | null) {
    if (activeProject) {
        switch (activeProject.photosPerPage) {
            case PhotosPerSpread.LOW:
                return GetTemplates(activeProject, PhotosPerSpread.MEDUIM)
            case PhotosPerSpread.MEDUIM:
                return GetTemplates(activeProject, PhotosPerSpread.HIGH)
            case PhotosPerSpread.HIGH:
                return GetTemplates(activeProject, PhotosPerSpread.MEDUIM)
        }
    }
    return  []
}
export function GetExrTemplates(activeProject: Album | null, photosPerPage: PhotosPerSpread) {
    if (activeProject) {
        switch (photosPerPage) {
            case PhotosPerSpread.LOW:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length <= 4 && e.photoFrames.length >= 3)
            case PhotosPerSpread.MEDUIM:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length <= 6 && e.photoFrames.length >= 6)
            case PhotosPerSpread.HIGH:
                return activeProject.template.pageTemplates.filter(e => e.photoFrames.length <= 5 && e.photoFrames.length >= 3)
        }
    }
    return  []
}

export function GetAlbumSmallPageMaxFrames(activeProject: Album | null) {

    if (activeProject) {
        switch (activeProject.photosPerPage) {
            case PhotosPerSpread.HIGH:
                return 3
        }
    }
    return  2
}
export function GetSmallPageMaxFrames(photosPerPage: PhotosPerSpread) {

    switch (photosPerPage) {
        case PhotosPerSpread.HIGH:
            return 3
    }
    return  2
}
export function CalculateMinMax(activeProject: Album | null,
                         smallPagePercent = 0.1) {

    if (activeProject && activeProject?.template) {

        let templates = GetTemplates(activeProject, activeProject.photosPerPage);
        let smallPageMaxSize = GetAlbumSmallPageMaxFrames(activeProject);

        let smallTemplates = templates.filter(t => t.photoFrames.length <= smallPageMaxSize);
        let largeTemplates = templates.filter(t => t.photoFrames.length > smallPageMaxSize);

        if (smallTemplates.length === 0 && largeTemplates.length === 0) {
            return null;
        }

        if (smallTemplates.length > 0 && largeTemplates.length > 0) {
            const minSmall = Math.ceil((activeProject.template.minSpreadsCount * 2) * smallPagePercent);
            const minLarge = (activeProject.template.minSpreadsCount * 2) - minSmall;

            const maxSmall = Math.ceil((activeProject.template.maxSpreadsCount * 2) * smallPagePercent);
            const maxLarge = (activeProject.template.maxSpreadsCount * 2) - maxSmall;

            const minSmallFrames = Math.min(...smallTemplates.map(t => t.photoFrames.length));
            const minLargeFrames = Math.min(...largeTemplates.map(t => t.photoFrames.length));
            const maxSmallFrames = Math.max(...smallTemplates.map(t => t.photoFrames.length));
            const maxLargeFrames = Math.max(...largeTemplates.map(t => t.photoFrames.length));

            const minPhotos = minSmall * minSmallFrames + minLarge * minLargeFrames;
            const maxPhotos = maxSmall * maxSmallFrames + maxLarge * maxLargeFrames;

            return {minPhotos, maxPhotos};
        }

        if (largeTemplates.length == 0)
            largeTemplates = smallTemplates;

        const minLargeFrames = Math.min(...largeTemplates.map(t => t.photoFrames.length));
        const maxLargeFrames = Math.max(...largeTemplates.map(t => t.photoFrames.length));

        const minPhotos = (activeProject.template.minSpreadsCount * 2) * minLargeFrames;
        const maxPhotos = (activeProject.template.maxSpreadsCount * 2) * maxLargeFrames;

        //console.log(JSON.stringify({minPhotos, maxPhotos}))

        return {minPhotos, maxPhotos} as MaxMinPhoto;



    }

    return null;


}

export function getFrameOrientation(frameType: number) {
    if(frameType === 1)
        return Orientation.PORTRAIT;
    return Orientation.LANDSCAPE;
}


export function removeSquares(pages: Page[], album: Album) {

    /*if(pages.length <= album.template.minSpreadsCount*2) {
        return  pages;
    }*/

    const squarePages = pages.filter(p => p.PageTemplate?.photoFrames.length == 1 && p.PageTemplate?.photoFrames.filter(e => e.type == 0).length == 1)

    if (squarePages.length <= 1)
        return pages;

    let templateWithTwo =  album.template.pageTemplates.find(e => e.photoFrames.length == 2 && e.photoFrames.filter(e => e.type == 0).length == 2)


    const first = squarePages[0];
    const second = squarePages[1];

    const firstIndex = pages.findIndex(e => e.id == first.id);
    const secondIndex = pages.findIndex(e => e.id == second.id);

    first.PageTemplate = templateWithTwo;
    first.PageTemplateId = templateWithTwo?.photoTemplateId;
    first.Photos.push(second.Photos[0]);

    first.Photos[0].frame = {...templateWithTwo?.photoFrames[0]};
    first.Photos[1].frame = {...templateWithTwo?.photoFrames[1]};

    pages = pages.filter(e => e.id != second.id);

    return removeSquares(pages, album);
}

export function convertLatestPages(pages: Page[], album: Album) {

    if(pages.length > 2) {

      /*  if (!pages[pages.length - 1].PageTemplateId && IsTwoVTemplate(pages[pages.length-2].PageTemplate)) {

            const first = pages[pages.length-2];
            const second = pages[pages.length - 1];

            let template =  album.template.pageTemplates.find(e => e.photoFrames.length == 1 && e.photoFrames.filter(e => e.type == 1).length == 1)
            if(template){
                second.Photos = [];

                first.PageTemplate = template;
                second.PageTemplate = template;
                first.PageTemplateId = template?.photoTemplateId;
                second.PageTemplateId = template?.photoTemplateId;
                first.Photos.push(second.Photos[0]);
                second.Photos.push(first.Photos[1]);

                first.Photos = first.Photos.filter(e => e.imageUrl != second.Photos[0].imageUrl)

                first.Photos[0].frame = {...template?.photoFrames[0]};
                second.Photos[0].frame = {...template?.photoFrames[0]};
            }
        }
        if (!pages[pages.length - 1].PageTemplateId && IsTwoHTemplate(pages[pages.length-2].PageTemplate)) {

            const first = pages[pages.length-2];
            const second = pages[pages.length - 1];

            let template =  album.template.pageTemplates.find(e => e.photoFrames.length == 1 && e.photoFrames.filter(e => e.type == 0).length == 1)
            if(template){
                second.Photos = [];

                first.PageTemplate = template;
                second.PageTemplate = template;
                first.PageTemplateId = template?.photoTemplateId;
                second.PageTemplateId = template?.photoTemplateId;
                first.Photos.push(second.Photos[0]);
                second.Photos.push(first.Photos[1]);

                first.Photos = first.Photos.filter(e => e.imageUrl != second.Photos[0].imageUrl)

                first.Photos[0].frame = {...template?.photoFrames[0]};
                second.Photos[0].frame = {...template?.photoFrames[0]};
            }
        }*/
    }
    return pages;
}


export function convertTwoWithBorders(pages: Page[], album: Album) {


    for(var i = 0;  i < pages.length-1; i = i+2) {


        const left = pages[i];
        const right = pages[i + 1];

        if(IsOneHTemplate(left.PageTemplate) && IsThreeHTemplate(right.PageTemplate)){

            let templateWithTwo =  album.template.pageTemplates.find(e => e.photoFrames.length == 2 && e.photoFrames.filter(e => e.type == 0).length == 2)

            left.PageTemplate = templateWithTwo;
            right.PageTemplate = templateWithTwo;

            left.PageTemplateId = templateWithTwo?.photoTemplateId;
            right.PageTemplateId = templateWithTwo?.photoTemplateId;
            const tmp = right.Photos[2]
            left.Photos.push(tmp);
            right.Photos = right.Photos.filter(e => e.imageUrl != tmp.imageUrl)
            left.Photos[0].frame = {...templateWithTwo?.photoFrames[0]};
            left.Photos[1].frame = {...templateWithTwo?.photoFrames[1]};
            right.Photos[0].frame = {...templateWithTwo?.photoFrames[0]};
            right.Photos[1].frame = {...templateWithTwo?.photoFrames[1]};
        }
        if(IsOneHTemplate(right.PageTemplate) && IsThreeHTemplate(left.PageTemplate)){

            let templateWithTwo =  album.template.pageTemplates.find(e => e.photoFrames.length == 2 && e.photoFrames.filter(e => e.type == 0).length == 2)

            left.PageTemplate = templateWithTwo;
            right.PageTemplate = templateWithTwo;

            left.PageTemplateId = templateWithTwo?.photoTemplateId;
            right.PageTemplateId = templateWithTwo?.photoTemplateId;

            const tmp = left.Photos[2]
            right.Photos.push(tmp);
            left.Photos = left.Photos.filter(e => e.imageUrl != tmp.imageUrl)

            right.Photos[0].frame = {...templateWithTwo?.photoFrames[0]};
            right.Photos[1].frame = {...templateWithTwo?.photoFrames[1]};
            left.Photos[0].frame = {...templateWithTwo?.photoFrames[0]};
            left.Photos[1].frame = {...templateWithTwo?.photoFrames[1]};
        }
    }
    return pages
}
export function moveHelpers(pages: Page[], album: Album) {



    const first = pages[0];
    const second = pages[1];

    const prelast = pages[pages.length-2];
    const last = pages[pages.length-1];

    if(IsOneHTemplate(first.PageTemplate)) {
        const normalPageIndex = pages.findIndex(
            (e, i) => i >= 2 && !e.HasBorders
        );
      //  console.log("first : " + normalPageIndex)
        if(normalPageIndex > 1 && normalPageIndex < 4) {
            pages[0] = pages[normalPageIndex]
            pages[normalPageIndex] = first
        }
    }
    if(IsOneHTemplate(second.PageTemplate)) {
        const normalPageIndex = pages.findIndex(
            (e, i) => i >= 2 && !e.HasBorders
        );
       // console.log("second : " + normalPageIndex)
        if(normalPageIndex > 1 && normalPageIndex < 5) {
            pages[1] = pages[normalPageIndex]
            pages[normalPageIndex] = second
        }
    }
    if(IsOneHTemplate(prelast.PageTemplate) && !pages[pages.length-1].PageTemplateId) {
        const normalPageIndex = findLastIndex(pages, e => IsTwoHTemplate(e.PageTemplate), pages.length-1);
        // console.log("prelast : " + normalPageIndex)
        if(normalPageIndex >= pages.length - 6 && normalPageIndex <= pages.length - 3) {
            pages[pages.length-2] = pages[normalPageIndex]
            pages[normalPageIndex] = prelast

            let templateWithThree =  album.template.pageTemplates.find(e => e.photoFrames.length == 3 && e.photoFrames.filter(e => e.type == 0).length == 3)


            const first = pages[normalPageIndex];

            first.PageTemplate = templateWithThree;
            first.PageTemplateId = templateWithThree?.photoTemplateId;
            first.Photos.push(prelast.Photos[0]);

            first.Photos[0].frame = {...templateWithThree?.photoFrames[0]};
            first.Photos[1].frame = {...templateWithThree?.photoFrames[1]};
            first.Photos[2].frame = {...templateWithThree?.photoFrames[2]};

            pages = pages.filter(e => e.id != prelast.id);
        }
    }
    if(IsOneHTemplate(prelast.PageTemplate) || IsTwoVTemplate(last.PageTemplate) ) {
        const normalPageIndex = findLastIndex(pages, e => !e.HasBorders, pages.length-3);
        // console.log("prelast : " + normalPageIndex)
        if(normalPageIndex >= pages.length - 6 && normalPageIndex <= pages.length - 3) {
            pages[pages.length-2] = pages[normalPageIndex]
            pages[normalPageIndex] = prelast
        }
    }
    if(IsOneHTemplate(last.PageTemplate) || IsTwoVTemplate(last.PageTemplate)) {

        const normalPageIndex = findLastIndex(pages, e => !e.HasBorders, pages.length-3);
       // console.log("last : " + normalPageIndex)
        if(normalPageIndex >= pages.length - 5 && normalPageIndex <= pages.length - 3) {
            pages[pages.length-1] = pages[normalPageIndex]
            pages[normalPageIndex] = last
        }
    }


    return pages
}

export function findLastIndex<T>(
    arr: T[],
    predicate: (value: T, index: number, array: T[]) => boolean,
    fromIndex: number = arr.length - 1
): number {
    for (let i = Math.min(fromIndex, arr.length - 1); i >= 0; i--) {
        if (predicate(arr[i], i, arr)) {
            return i;
        }
    }
    return -1;
}

export function resizePhoto(photo: Photo, oldPhoto: Photo,real_to_digital_width_scale: number, real_to_digital_height_scale: number){

    photo.frame = {...oldPhoto.frame};

    return calculatePhoto(photo,real_to_digital_width_scale,real_to_digital_height_scale)
}

export function generatePhotoBook(
    photosPerSpread: PhotosPerSpread,
    _templates: PageTemplate[],
    _smallTemplates: PageTemplate[],
    _alternativeTemplates: PageTemplate[],
    photos: Photo[],
    maxPages: number,
    album: Album
): {pages: Page[], photos: number}  {

    const templates = [..._templates.filter(e => e.position == Position.NONE)];
    const templatesNoPriority = [..._templates.filter(e => e.position != Position.NONE)];
  //  console.log(Date.now() +  " templates : "  + templates.length)
   // console.log(Date.now() +  " templatesNoPriority : "  + templatesNoPriority.length)
    const smallTemplates = [..._smallTemplates.filter(e => e.position == Position.NONE)];
    //const smallTemplatesNoPriority = [..._smallTemplates.filter(e => e.position != Position.NONE)];
   // console.log(Date.now() +  " smallTemplates : "  + smallTemplates.length)
   // console.log(Date.now() +  " smallTemplatesNoPriority : "  + smallTemplatesNoPriority.length)
    const alternativeTemplates = [..._alternativeTemplates.filter(e => e.position == Position.NONE)];
   // const alternativeTemplatesNoPriority = [..._alternativeTemplates.filter(e => e.position != Position.NONE)];
   // console.log(Date.now() +  " alternativeTemplates : "  + smallTemplates.length)
   // console.log(Date.now() +  " alternativeTemplatesNoPriority : "  + smallTemplatesNoPriority.length)

    const templatesHistory = new Map([...templates,...smallTemplates,...alternativeTemplates].map(e => [e.photoTemplateId, { template: e, count: 0 } as TemplateHistoryItem]));

    const photoQueue = [...photos];
    const resultPages: Page[] = [];


   // console.log("photosPerSpread : " + photosPerSpread)

    const tryMatchTemplate = (template: PageTemplate): Photo[] | null => {

        let tempQueue = [...photoQueue.sort((a, b) => a.index - b.index)].splice(0,photoQueue.length >= template.photoFrames.length*2 ? template.photoFrames.length*2 : photoQueue.length);
        const result: Photo[] = [];
        if(tempQueue.length == 0)
            return null;

        //  console.log(JSON.stringify(template.photoFrames))
        const _frames = [...template.photoFrames].sort((a, b) => a.index - b.index);
        for (let frame of _frames) {
            for (let photo of tempQueue) {
               // console.log(Date.now() + " index : " + photo.index)
                if (photo.orientation != getFrameOrientation(frame.type)) {
                  //  console.log(Date.now() + " index : " +photo.index + " wrong orientation " + photo.orientation + " != " + getFrameOrientation(frame.type))
                    continue;
                }

                if ((photo.isFavorite) && _frames.length > 3) {
                 //   console.log(Date.now() + " index : " +photo.index + " is favorite")
                    continue;
                }
                /* const photoIdx = tempQueue.findIndex(
                   (p) => p.orientation === getFrameOrientation(frame.type)
               );
             if(photoIdx > frames.length) {
                   console.log(Date.now() +  " index too far")
                   return null;
               }
               if (photoIdx === -1) return null;*/


                tempQueue = tempQueue.filter(e => e.id != photo.id).sort((a, b) => a.index - b.index);
                //console.log(Date.now() +  " matchedPhoto " + matchedPhoto.index)
                result.push({...photo, frame: {...frame}});
                //  console.log(Date.now() + " index : " + photo.index + " +++++")
                break;
            }
        }
        if(result.length != _frames.length)
            return  null;

        //  console.log(Date.now() + " selected!!!!!!!!")
        return result;
    };

    const tryMatchTemplateWithPhoto = (template: PageTemplate, photo: Photo, allowFav = false): Photo[] | null => {

        let tempQueue = [...photoQueue.sort((a, b) => a.index - b.index)].splice(0,photoQueue.length >= template.photoFrames.length ? template.photoFrames.length : photoQueue.length);
     //   console.log("tempQueue length : " + tempQueue.length)
        const result: Photo[] = [];
        if(tempQueue.length == 0)
            return null;


       // console.log("template : " + template.photoFrames.length)
        let _frames = [...template.photoFrames].sort((a, b) => a.index - b.index);

       // if(template.photoTemplateId == 79 && photosPerSpread == PhotosPerSpread.MEDUIM)
         //    console.log(Date.now() + " tempQueue : " + tempQueue.length)
            for (let photo of tempQueue) {
               /* console.log(Date.now() + " photo : " + photo.index)
                if(photo.isFavorite) {
                    console.log(Date.now() + " index : " +photo.index + " is favorite")
                    console.log("photosPerSpread : " + (photosPerSpread == PhotosPerSpread.MEDUIM))
                }*/
               /* if (photosPerSpread == PhotosPerSpread.LOW) {
                    if ((photo.isFavorite) && template.photoFrames.length > 2) {
                        //console.log(Date.now() + " LOW index : " + photo.index + " is favorite")
                        return null;
                    }
                }
                if (photosPerSpread == PhotosPerSpread.MEDUIM) {

                    if ((photo.isFavorite) && template.photoFrames.length > 2) {
                      //  console.log(Date.now() + " MEDUIM index : " + photo.index + " is favorite")
                        return null;
                    }
                }

                if (photosPerSpread == PhotosPerSpread.MEDUIM) {
                        if ((photo.isFavorite) && template.photoFrames.length > 3) {
                           // console.log(Date.now() + " HIGH index : " +photo.index + " is favorite")
                            return null;
                        }
                }*/

                var found = false;
               // if(template.photoTemplateId == 79 && photosPerSpread == PhotosPerSpread.MEDUIM)
                 //   console.log(Date.now() + " _frames : " + _frames.length)
                for (let frame of _frames) {

                    if (photo.orientation != getFrameOrientation(frame.type)) {
                        //if(template.photoTemplateId == 79 && photosPerSpread == PhotosPerSpread.MEDUIM)
                          //console.log(Date.now() + " index : " +photo.index + " wrong orientation " + photo.orientation + " != " + getFrameOrientation(frame.type))
                        continue;
                    }
                    //if(template.photoTemplateId == 79 && photosPerSpread == PhotosPerSpread.MEDUIM)
                      //  console.log(Date.now() + " index : " +photo.index + " passed " + photo.orientation + " == " + getFrameOrientation(frame.type))
                    if(photo.isBig) {

                        if (photo.orientation == Orientation.PORTRAIT && template.photoFrames.length > 1) {
                            return null;
                        }
                        if (photo.orientation == Orientation.LANDSCAPE && template.photoFrames.length > 1) {
                            return null;
                        }
                    }

                    if (photosPerSpread == PhotosPerSpread.LOW || photosPerSpread == PhotosPerSpread.MEDUIM) {
                        if ((photo.isFavorite) && photo.orientation == Orientation.PORTRAIT && template.photoFrames.length > 1) {

                           // console.log(Date.now() + " LOW index : " + photo.index + " is favorite")
                            return null;
                        }
                        if(allowFav) {
                            if ((photo.isFavorite) && photo.orientation == Orientation.LANDSCAPE && template.photoFrames.length > 1) {

                               // console.log(Date.now() + " LOW index : " + photo.index + " is favorite allowFav")
                                return null;
                            }
                        } else {
                            if ((photo.isFavorite) && photo.orientation == Orientation.LANDSCAPE && (frame.width < album.template.width * 0.9
                                || frame.height < album.template.height * 0.45)) {

                              //  console.log(Date.now() + " LOW index : " + photo.index + " is favorite")
                                return null;
                            }
                        }
                    }
                    if (photosPerSpread == PhotosPerSpread.HIGH) {

                        if ((photo.isFavorite) && photo.orientation == Orientation.PORTRAIT && (frame.width < album.template.width * 0.45
                            || frame.height < album.template.height * 0.45)) {

                           // console.log(Date.now() + " LOW index : " + photo.index + " is favorite")
                            return null;
                        }
                        if(allowFav) {
                            if ((photo.isFavorite) && photo.orientation == Orientation.LANDSCAPE && template.photoFrames.length > 1) {

                                // console.log(Date.now() + " LOW index : " + photo.index + " is favorite allowFav")
                                return null;
                            }
                        } else {
                            if ((photo.isFavorite) && photo.orientation == Orientation.LANDSCAPE && (frame.width < album.template.width * 0.65
                                || frame.height < album.template.height * 0.25)) {

                                // console.log(Date.now() + " LOW index : " + photo.index + " is favorite")
                                return null;
                            }
                        }
                    }
                //    if(template.photoTemplateId == 79 && photosPerSpread == PhotosPerSpread.MEDUIM)
                  //      console.log("MATCHED")
                    /* const photoIdx = tempQueue.findIndex(
                       (p) => p.orientation === getFrameOrientation(frame.type)
                   );
                 if(photoIdx > frames.length) {
                       console.log(Date.now() +  " index too far")
                       return null;
                   }
                   if (photoIdx === -1) return null;*/

                  /*  if (template.photoFrames.length == 1 && template.photoFrames.filter(e => e.type == 0).length == 1) {
                        // console.log(Date.now() + " searchTemplates alternativeTemplates")
                        if (searchTemplatesForPhoto(photo, alternativeTemplates.filter(e => e.priority == 0), true, "alternativeTemplates")) {
                            // console.log(Date.now() + " selected from alternativeTemplates")
                            continue;
                        }
                        // console.log(Date.now() + " searchTemplates alternativeTemplatesNoPriority")
                        if (searchTemplatesForPhotoInOrder(photo, alternativeTemplates.filter(e => e.priority == 3), true, "alternativeTemplates 3")) {
                            //console.log(Date.now() + " selected from alternativeTemplatesNoPriority")
                            continue;
                        }
                        // console.log(Date.now() + " searchTemplates alternativeTemplatesNoPriority")
                        if (searchTemplatesForPhotoInOrder(photo, alternativeTemplates.filter(e => e.priority == 5), true, "alternativeTemplates 5")) {
                            //console.log(Date.now() + " selected from alternativeTemplatesNoPriority")
                            continue;
                        }

                    }*/


                    tempQueue = tempQueue.filter(e => e.id != photo.id).sort((a, b) => a.index - b.index);
                    _frames = _frames.filter(e => e.index != frame.index).sort((a, b) => a.index - b.index);
                    //console.log(Date.now() +  " matchedPhoto " + matchedPhoto.index)
                    result.push({...photo, frame: {...frame}});
                  //  console.log(Date.now() + " selected photo : " + photo.index + " +++++")
                    found = true;
                    break;
                }
                if(!found)
                    return null;

            }
        if(result.length != template.photoFrames.length) {
          //  console.log(Date.now() + " template not selected : " + template.photoFrames.length)
            return null;
        }
       // console.log(Date.now() + " template selected : " + template.photoFrames.length +  "!!!!!")
        return result;
    };

    const getLeastUsedTemplate = (_templates: PageTemplate[]): PageTemplate | null => {
        if (_templates.length === 0) return null;

        // Build a fast lookup by templateId
        const allowedIds = new Set(_templates.map(t => t.photoTemplateId));

        let best: TemplateHistoryItem | null = null;
        const checkedTemplates = new Array<TemplateHistoryItem>()

        for (const [templateId, item] of templatesHistory) {
            if (!allowedIds.has(templateId)) continue;

            if (!best
            ) {
                best = item;
                checkedTemplates.push(item)
                continue;
            }
            if (item.count < best.count
            ) {
                best = item;
                checkedTemplates.push(item)
            }
        }
      //  if(checkedTemplates.filter(e => e.count > best?.count).length == 0) {
            //  console.log(Date.now() + " getRandomItem " + best?.count)
        //    return getRandomItem(_templates);
       // }
        //console.log(Date.now() + " get min item " + best?.count)
       // return best?.template ?? null;
        const tmplH = getRandomItem(checkedTemplates.filter(e => e.count == best?.count));
        if(!tmplH)
            return  null;
        //console.log("TEMPLATE : " + tmplH.template.photoTemplateId + " / " + tmplH.count)
       // const tmpl = _templates.find(e => e.photoTemplateId == tmpl?.template.photoTemplateId)
       return {... tmplH.template}
        //console.log(Date.now() + " get min item " + best?.count)
        //return best?.template ?? null;

    }

    const searchTemplatesForPhoto = (photo: Photo, _templates: PageTemplate[], fromLarge:boolean, type: string): boolean => {

        if(!photo)
            return  false;

        //console.log("!!!!! : " + _templates.filter(e => e.photoTemplateId == 79).length)
        /* let _sortedTemplates = fromLarge ? [...templates].sort(
             (a, b) => b.photoFrames.length - a.photoFrames.length
         ) : [...templates].sort(
             (a, b) => a.photoFrames.length - b.photoFrames.length
         );*/
        let test = true
        let _sortedTemplates = [..._templates];
        while(_sortedTemplates.length > 0)
        {
            let tmpl = getLeastUsedTemplate(_sortedTemplates);
            if (tmpl == null) {

                //console.log("tmpl not found")
                break;
            }
          //  console.log("tmpl to try : " + tmpl.photoTemplateId)
            if(tmpl.hasBorders && resultPages.length <=1) {
               // console.log("skip tmpl to try : " + tmpl.photoTemplateId + " no borders on first page")
                _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }


            if(album.photosPerPage == PhotosPerSpread.HIGH && resultPages.length > 0) {

                let historyLength = 1
                if(resultPages.length == 2)
                    historyLength = 2
                if(resultPages.length == 3)
                    historyLength = 3

                if(resultPages.length > 3) {
                    if (resultPages.length % 2 == 0) {
                        historyLength = 4
                    } else {
                        historyLength = 5
                    }
                }

                const latestPages = new Array<Page>();
                let reverseIndex = 0
                for (let i = resultPages.length-1; i >= 0; i--) {
                    if (reverseIndex >= historyLength) {

                        break;
                    }
                    latestPages.push(resultPages[i]);
                    reverseIndex = reverseIndex+1;
                }

                if(latestPages.filter(e => {return e.PageTemplate?.photoTemplateId == tmpl?.photoTemplateId}).length > 0)
                {
                  //  console.log("skip tmpl to try : " + tmpl.photoTemplateId + " min distance")
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }
                //console.log(JSON.stringify(latestPages.map(e => { return e.PageTemplateId})))
            }


            if(album.photosPerPage != PhotosPerSpread.HIGH && resultPages.length > 0 && album.template.maxSpreadsCount >= 15) {

                let historyLength = 1

                if(resultPages.length > 1) {
                    if (resultPages.length % 2 == 0) {
                        historyLength = 2
                    } else {
                        historyLength = 3
                    }
                }

                const latestPages = new Array<Page>();
                let reverseIndex = 0
                for (let i = resultPages.length-1; i >= 0; i--) {
                    if (reverseIndex >= historyLength) {

                        break;
                    }
                    latestPages.push(resultPages[i]);
                    reverseIndex = reverseIndex+1;
                }

                if(latestPages.filter(e => {return e.PageTemplate?.photoTemplateId == tmpl?.photoTemplateId}).length > 0)
                {
                   // console.log("skip tmpl to try : " + tmpl.photoTemplateId + " min distance")
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }
                //console.log(JSON.stringify(latestPages.map(e => { return e.PageTemplateId})))
            }

            if(tmpl.hasBorders  && resultPages.length > 0) {
                 let historyLength = 2
                if(resultPages.length >2 ) {

                    if(resultPages.length == 3 ) {
                        historyLength = 1;
                    } else {
                        if (resultPages.length % 2 == 0) {
                            historyLength = 4
                        } else {
                            historyLength = 5
                        }
                    }
                    const latestPages = new Array<Page>();
                    let reverseIndex = 0
                    for (let i = resultPages.length - 1; i >= 0; i--) {
                        if (reverseIndex >= historyLength)
                            break;
                        latestPages.push(resultPages[i]);
                        reverseIndex = reverseIndex + 1;
                    }

                    if (latestPages.filter(e => {
                        return e.PageTemplate?.hasBorders
                    }).length > 0) {
                       // console.log("skip tmpl to try : " + tmpl.photoTemplateId + " borders distance")
                        _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                        continue;
                    }

                }
            }

            if((IsTwoVTemplate(tmpl) || IsThreeHTemplate(tmpl)) && photoQueue.length < 24) {
               // console.log("skip tmpl to try : " + tmpl.photoTemplateId + " IsTwoVTemplate or IsThreeHTemplate  in the end")
                _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }

            let gap = 10;
            if( IsTwoVTemplate(tmpl) && album.template.maxSpreadsCount >= 12) {
                gap = 20;
            }
            if(IsTwoVTemplate(tmpl) && resultPages.length >0 && resultPages.length%2 ==1 && !IsOneVTemplate(resultPages[resultPages.length-1].PageTemplate)){
                //  console.log("skip tmpl to try : " + tmpl.photoTemplateId + " IsTwoVTemplate not with IsOneVTemplate")
                _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }
            if( IsTwoVTemplate(tmpl)) {

                if(resultPages.length < 10){
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }
                if(album.template.maxSpreadsCount >= 12 && resultPages.length < 20){
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }

                let historyLength = gap

                if (resultPages.length % 2 == 0) {
                    historyLength = gap
                }
                const latestPages = new Array<Page>();
                let reverseIndex = 0
                for (let i = resultPages.length - 1; i >= 0; i--) {
                    if (reverseIndex >= historyLength)
                        break;
                    latestPages.push(resultPages[i]);
                    reverseIndex = reverseIndex + 1;
                }

                if (latestPages.filter(e => {
                    return e.PageTemplate?.hasBorders
                }).length > 0) {
                    _sortedTemplates = _sortedTemplates.filter(e => e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }

            }



           // console.log("check template : " + tmpl.photoTemplateId + " with frames " +  tmpl.photoFrames.length)
            // for (let tmpl of sortedTemplates) {
         //    console.log("check template : " + tmpl.photoTemplateId)
            const matchedPhotos = tryMatchTemplateWithPhoto(tmpl, photo);
            if (matchedPhotos == null || matchedPhotos.length == 0) {
                // console.log("not matchedPhotos")
              //  console.log("skip tmpl to try : " + tmpl.photoTemplateId + " no matched photos")
                _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }
            // console.log("check template ++++ ")

            if (matchedPhotos) {
                // const tmpSortedTemplates = templates.filter(e =>e.photoFrames.length == tmpl.photoFrames.length)
                // console.log("template " + tmpl.photoFrames.length + " : " + tmpSortedTemplates.length)
                // let tmplSelected = getRandomItem(tmpSortedTemplates)
                // if(!tmplSelected)
                //     tmplSelected = tmpl;

               /* if(checkForSecondSquare(tmpl,matchedPhotos[0])) {
                    // console.log("not matchedPhotos")
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }*/



                resultPages.push({
                    id: uuidv4(),
                    PageTemplateId: tmpl.photoTemplateId,
                    PageTemplate: tmpl,
                    Photos: matchedPhotos,
                });

             //   console.log("SELECTED : " + tmpl?.photoTemplateId + " page : " + resultPages.length)
                // Удаляем использованные фото
                matchedPhotos.forEach((p) => {
                    const index = photoQueue.findIndex((q) => q.id === p.id);
                    if (index !== -1) photoQueue.splice(index, 1);
                });

                const item = templatesHistory.get(tmpl.photoTemplateId);
                if (item) {
                    item.count += 1;
                }
                //matched = true;
                //break;
                //console.log(Date.now() +  " !!! " + matchedPhotos.length)
                return true
            }
            // }

            // if (!matched) break;
        }
        return false;
    };


    const searchTemplatesForPhotoInOrder = (photo: Photo, _templates: PageTemplate[], fromLarge:boolean, type: string, allowFav = false): boolean => {

        // console.log("searchTemplatesForPhoto InOrder : " + type)

        if (!photo)
            return false;


        let _sortedTemplates = fromLarge ? [..._templates].sort(
            (a, b) => b.photoFrames.length - a.photoFrames.length
        ) : [..._templates].sort(
            (a, b) => a.photoFrames.length - b.photoFrames.length
        );
        // let _sortedTemplates = [..._templates];
        //console.log("searchTemplatesForPhotoInOrder : " + _sortedTemplates.length)
        for (let tmpl of _sortedTemplates) {

            if((IsTwoVTemplate(tmpl) || IsThreeHTemplate(tmpl) ) && resultPages.length <=1) {
                continue;
            }

            if((IsTwoVTemplate(tmpl) || IsThreeHTemplate(tmpl)) && photoQueue.length < 24) {
                continue;
            }
            if (IsTwoVTemplate(tmpl) && resultPages.length > 0 && resultPages.length % 2 == 1 && !IsOneVTemplate(resultPages[resultPages.length - 1].PageTemplate)) {
                continue;
            }
            let gap = 10;
            if( IsTwoVTemplate(tmpl) && album.template.maxSpreadsCount >= 12) {
                gap = 20;
            }
            if (tmpl.hasBorders && IsTwoVTemplate(tmpl)) {

                if(resultPages.length < 10){
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }
                if(album.template.maxSpreadsCount >= 12 && resultPages.length < 20){
                    _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                    continue;
                }

                let historyLength = gap

                if (resultPages.length % 2 == 0) {
                    historyLength = gap
                }
                const latestPages = new Array<Page>();
                let reverseIndex = 0
                for (let i = resultPages.length - 1; i >= 0; i--) {
                    if (reverseIndex >= historyLength)
                        break;
                    latestPages.push(resultPages[i]);
                    reverseIndex = reverseIndex + 1;
                }

                if (latestPages.filter(e => {
                    return e.PageTemplate?.hasBorders
                }).length > 0) {
                    continue;
                }
            }
            //let tmpl = getRandomItem(_sortedTemplates);
            //if (tmpl == null) {

            //console.log("tmpl not found")
            //    break;
            //}
            // for (let tmpl of sortedTemplates) {
            // console.log("check template : " + tmpl.photoTemplateId + " with frames " +  tmpl.photoFrames.length)
            const matchedPhotos = tryMatchTemplateWithPhoto(tmpl, photo, allowFav);
            if (matchedPhotos == null || matchedPhotos.length == 0) {
                //  console.log("not matchedPhotos")
                // _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }
            // console.log("check template ++++ ")

            if (matchedPhotos) {
                // const tmpSortedTemplates = templates.filter(e =>e.photoFrames.length == tmpl.photoFrames.length)
                // console.log("template " + tmpl.photoFrames.length + " : " + tmpSortedTemplates.length)
                // let tmplSelected = getRandomItem(tmpSortedTemplates)
                // if(!tmplSelected)
                //     tmplSelected = tmpl;

                /* if(checkForSecondSquare(tmpl, matchedPhotos[0])) {
                     continue;
                 }*/


                resultPages.push({
                    id: uuidv4(),
                    PageTemplateId: tmpl.photoTemplateId,
                    PageTemplate: tmpl,
                    Photos: matchedPhotos,
                });
                //console.log("SELECTED LOW : " + tmpl?.photoTemplateId + " page : " + resultPages.length)
                // Удаляем использованные фото
                matchedPhotos.forEach((p) => {
                    const index = photoQueue.findIndex((q) => q.id === p.id);
                    if (index !== -1) photoQueue.splice(index, 1);
                });

                const item = templatesHistory.get(tmpl.photoTemplateId);
                if (item) {
                    item.count += 1;
                }
                //matched = true;
                //break;
                // console.log(Date.now() +  " !!! " + matchedPhotos.length)
                return true
            }
            // }

            // if (!matched) break;
        }
        //  console.log("not matched")
        return false;
    };



    const searchTemplates = (templates: PageTemplate[], fromLarge:boolean): boolean => {

        if(!templates || templates.length == 0)
            return  false;

       /* let _sortedTemplates = fromLarge ? [...templates].sort(
            (a, b) => b.photoFrames.length - a.photoFrames.length
        ) : [...templates].sort(
            (a, b) => a.photoFrames.length - b.photoFrames.length
        );*/

        let _sortedTemplates = [...templates];
        while(_sortedTemplates.length > 0)
        {
            let tmpl = getRandomItem(_sortedTemplates);
            if (tmpl == null) {

                //console.log("tmpl not found")
                break;
            }
            // for (let tmpl of sortedTemplates) {
           // console.log("check template : " + tmpl.photoFrames.length)
            const matchedPhotos = tryMatchTemplate(tmpl);
            if (matchedPhotos == null || matchedPhotos.length == 0) {
               // console.log("not matchedPhotos")
                _sortedTemplates=_sortedTemplates.filter(e=>e.photoTemplateId != tmpl?.photoTemplateId);
                continue;
            }
           // console.log("check template ++++ ")


            if (matchedPhotos) {

                // const tmpSortedTemplates = templates.filter(e =>e.photoFrames.length == tmpl.photoFrames.length)
                // console.log("template " + tmpl.photoFrames.length + " : " + tmpSortedTemplates.length)
                // let tmplSelected = getRandomItem(tmpSortedTemplates)
                // if(!tmplSelected)
                //     tmplSelected = tmpl;

                //console.log("SELECTED LOW : " + tmpl?.photoTemplateId)

                resultPages.push({
                    id: uuidv4(),
                    PageTemplateId: tmpl.photoTemplateId,
                    PageTemplate: tmpl,
                    Photos: matchedPhotos,
                });

                // Удаляем использованные фото
                matchedPhotos.forEach((p) => {
                    const index = photoQueue.findIndex((q) => q.id === p.id);
                    if (index !== -1) photoQueue.splice(index, 1);
                });

                const item = templatesHistory.get(tmpl.photoTemplateId);
                if (item) {
                    item.count += 1;
                }

                //matched = true;
                //break;
                //console.log(Date.now() +  " !!! " + matchedPhotos.length)
                return true
            }
            // }

            // if (!matched) break;
        }
        return false;
    };

    const isTwoVTemplateLimitReached  = (template: PageTemplate): boolean  => {
        const historyArray = Array.from(templatesHistory.entries()).map(
            ([templateId, item]) => ({
                templateId,
                count: item.count
            })
        );
        const tmpl=historyArray.find(e=>e.templateId == template.photoTemplateId );
        if(!tmpl) return true;
        switch (tmpl.count) {

        }
    };

    while (photoQueue.length > 0 /*&& resultPages.length < maxPages*/) {
        let matched = false;
        /*const sortedTemplates = fromLarge ? [...templates].sort(
            (a, b) => b.photoFrames.length - a.photoFrames.length
        ) : [...templates].sort(
            (a, b) => a.photoFrames.length - b.photoFrames.length
        );*/
        /*const sortedTemplates1 = fromLarge ? [...templates].sort(
            (a, b) => a.photoFrames.length - b.photoFrames.length
        ) : [...templates].sort(
            (a, b) => b.photoFrames.length - a.photoFrames.length
        );*/
        //    const sortedTemplates = getRandomItem([...templates]);

        /* let t1 = getRandomItem(sortedTemplates)
         let t2 = getRandomItem(sortedTemplates1)*/
        // 1. Пробуем разворот
        /*for (let t1 of sortedTemplates) {


            for (let t2 of sortedTemplates1) {



                const allFrames = [...t1.photoFrames, ...t2.photoFrames];
                const allPhotos = tryMatchTemplate(allFrames);

                if (allPhotos) {
                    const p1 = allPhotos.slice(0, t1.photoFrames.length).map((p, i) => ({
                        ...p,
                        frameIndex: i,
                    }));
                    const p2 = allPhotos.slice(t1.photoFrames.length).map((p, i) => ({
                        ...p,
                        frameIndex: i,
                    }));


                    const t1SortedTemplates = templates.filter(e =>e.photoFrames.length == t1.photoFrames.length)

                    let t1Selected = getRandomItem(t1SortedTemplates)
                    if(!t1Selected)
                        t1Selected = t1;
                    const t2SortedTemplates = templates.filter(e =>e.photoFrames.length == t2.photoFrames.length)

                    let t2Selected = getRandomItem(t2SortedTemplates)
                    if(!t2Selected)
                         t2Selected = t2;

                    resultPages.push({ id: uuidv4(), PageTemplate: t1Selected, PageTemplateId: t1Selected.photoTemplateId, Photos: p1 });
                    resultPages.push({ id: uuidv4(), PageTemplate: t2Selected, PageTemplateId: t2Selected.photoTemplateId, Photos: p2 });

                    // Удаляем использованные фото
                    allPhotos.forEach((p) => {
                        const index = photoQueue.findIndex((q) => q.id === p.id);
                        if (index !== -1) photoQueue.splice(index, 1);
                    });

                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

       if (matched) continue;*/

        // 2. Пробуем одиночные шаблоны

        const nextPhoto = photoQueue[0];
        //   console.log('photoQueue : ' +photoQueue.length)
        // console.log('nextPhoto : ' + nextPhoto.index)
        /*if( nextPhoto.isFavorite) {
           // console.log(Date.now() + " nextPhoto is F " + nextPhoto.index)
            if (searchTemplatesForPhoto(nextPhoto, smallTemplates.filter(e => e.priority == 0), true)) {
            //    console.log(Date.now() + " selected from smallTemplates for F")
                continue;
            }
            //console.log(Date.now() + " selected from smallTemplatesNoPriority for F")
            searchTemplatesForPhoto(nextPhoto, smallTemplates, true);
        } else {*/

        if (resultPages.length > 0 && resultPages.length % 2 == 1 && photoQueue.length >= 24 && IsTwoVTemplate(resultPages[resultPages.length - 1].PageTemplate)) {
            searchTemplatesForPhotoInOrder(nextPhoto, smallTemplates.filter(e => e.photoFrames.length == 1), true, "smallTemplates 5", true)
            continue;
        }

        if (searchTemplatesForPhoto(nextPhoto, templates.filter(e => e.priority == 0), true, "templates")) {
            //   console.log(Date.now() + " selected from templates")
            continue;
        }
        // console.log(Date.now() + " searchTemplates alternativeTemplates")
        if (searchTemplatesForPhoto(nextPhoto, alternativeTemplates.filter(e => e.priority == 0), true, "alternativeTemplates")) {
            //  console.log(Date.now() + " selected from alternativeTemplates")
            continue;
        }
        // console.log(Date.now() + " searchTemplates templatesNoPriority")
        if (searchTemplatesForPhoto(nextPhoto, templates.filter(e => e.priority == 3), true, "templates 3")) {
            // console.log(Date.now() + " selected from templatesNoPriority")
            continue;
        }
        // console.log(Date.now() + " searchTemplates alternativeTemplatesNoPriority")
        if (searchTemplatesForPhoto(nextPhoto, alternativeTemplates.filter(e => e.priority == 3), true, "alternativeTemplates 3")) {
            //   console.log(Date.now() + " selected from alternativeTemplatesNoPriority")
            continue;
        }
        // console.log(Date.now() + " searchTemplates templatesNoPriority")
        if (searchTemplatesForPhoto(nextPhoto, templates.filter(e => e.priority == 5), true, "templates 5")) {
            // console.log(Date.now() + " selected from templatesNoPriority")
            continue;
        }
        // console.log(Date.now() + " searchTemplates alternativeTemplatesNoPriority")
        if (searchTemplatesForPhoto(nextPhoto, alternativeTemplates.filter(e => e.priority == 5), true, "alternativeTemplates 5")) {
            //  console.log(Date.now() + " selected from alternativeTemplatesNoPriority")
            continue;
        }
        // console.log(Date.now() + " searchTemplates smallTemplates")
        if (searchTemplatesForPhoto(nextPhoto, smallTemplates.filter(e => e.priority == 0), true, "smallTemplates")) {
            //   console.log(Date.now() + " selected from smallTemplates")
            continue;
        }

        if (searchTemplatesForPhoto(nextPhoto, smallTemplates.filter(e => e.priority == 3), true, "smallTemplates 3")) {
            //  console.log(Date.now() + " selected from smallTemplates")
            continue;
        }
        // console.log(Date.now() + " searchTemplates smallTemplatesNoPriority")
        //  console.log(Date.now() + " selected from smallTemplatesNoPriority : " + smallTemplates.length)
        if (searchTemplatesForPhoto(nextPhoto, smallTemplates, true, "smallTemplates 5")) {
            continue;
        }
        //if(!searchTemplatesForPhoto(nextPhoto, album.template.pageTemplates, true, "all templates")) {
        if(!searchTemplatesForPhotoInOrder(nextPhoto, smallTemplates, true, "smallTemplates 5", true)){

            return { pages : [], photos: 0}
        }
        //}
        //}
        // console.log("photoQueue : " + photoQueue.length + "/" + resultPages.length)

    }
   // console.log("resultPages : " + photoQueue.length + " / " + resultPages.length)

  /*  const historyArray = Array.from(templatesHistory.entries()).map(
        ([templateId, item]) => ({
            templateId,
            count: item.count
        })
    );
    console.log("templatesHistory : " + JSON.stringify(historyArray))*/

    //если есть


    return { pages : resultPages/*.slice(0, maxPages)*/, photos: photoQueue.length}
}

export function replaceSpreadInPhotoBook(
    mockUp: any,
    photosPerSpread: PhotosPerSpread,
    _templates: PageTemplate[],
    _smallTemplates: PageTemplate[],
    _alternativeTemplates: PageTemplate[],
    album: Album,
 limit: number
): {pages: Page[], photos: number}  {
   // console.log("sMedium replaceSpreadInPhotoBook" + " pages: " + (mockUp ? mockUp.pages.length : 0))

    const templates = [..._templates.filter(e => e.position == Position.NONE)];
    const smallTemplates = [..._smallTemplates.filter(e => e.position == Position.NONE)];
    const alternativeTemplates = [..._alternativeTemplates.filter(e => e.position == Position.NONE)];

    let resultPages = (mockUp.pages as Page[]).map(e => {return  {...e}});

    const processing = true;
    let startIndex = 0;
    let endIndex = -1;
    while (processing) {
        startIndex = endIndex+1;
        const pagesToOptimise = new Array<Page>();
        for (let i = startIndex; i < resultPages.length; i++) {
            if (i <= 1) {
                startIndex = i+1
                continue;
            }
            if (i >= resultPages.length - 3) {
                endIndex = i
                break;
            }
            if (resultPages[i].Photos.filter(e => e.isFavorite).length > 0) {

                if(pagesToOptimise.length > 0) {
                    endIndex = i
                    break;
                }
                startIndex = i+1
                continue;
            }
            if (resultPages[i].PageTemplate?.photoFrames?.length > limit) {

                endIndex = i
                if(pagesToOptimise.length > 0) {
                    endIndex = i
                    break;
                }
                startIndex = i+1
                continue;
            }
            if(pagesToOptimise.length == 8) {
                endIndex = i
                break;
            }

            pagesToOptimise.push(resultPages[i])
        }

        if (pagesToOptimise.length == 0)
             break;

        let normalPhotos = new Array<Photo>()
        for (let i = 0; i < pagesToOptimise.length; i++) {
            normalPhotos =  normalPhotos.concat(pagesToOptimise[i].Photos);

        }

        const _mockup = generatePhotoBook(photosPerSpread, templates,
            smallTemplates,
            alternativeTemplates, normalPhotos, album.template.maxSpreadsCount * 2, album)

        if(_mockup.pages.length > 0 && _mockup.pages.length < pagesToOptimise.length) {

            resultPages = [...resultPages.slice(0, startIndex), ..._mockup.pages, ...resultPages.slice(endIndex+1)]

            break;
        }
        if(_mockup.pages.length == 0) {
            endIndex = startIndex+2

        }
    }

    return { pages : resultPages/*.slice(0, maxPages)*/, photos: 0}
}

function IsTwoHTemplate(template:PageTemplate|null){
    if(!template)
        return  false
    return template.hasBorders && template.photoFrames.length == 2 && template.photoFrames.filter(e => e.type == 0).length == 2
}
function IsTwoVTemplate(template:PageTemplate|null){
    if(!template)
        return  false
   return template.hasBorders && template.photoFrames.length == 2 && template.photoFrames.filter(e => e.type == 1).length == 2
}
function IsOneHTemplate(template:PageTemplate|null){
    if(!template)
        return  false
    return template.hasBorders && template.photoFrames.length == 1 && template.photoFrames.filter(e => e.type == 0).length == 1
}
function IsThreeHTemplate(template:PageTemplate|null){
    if(!template)
        return  false
    return template.hasBorders && template.photoFrames.length == 3 && template.photoFrames.filter(e => e.type == 0).length == 3
}
function IsOneVTemplate(template:PageTemplate|null){
    if(!template)
        return  false
    return template.hasBorders && template.photoFrames.length == 1 && template.photoFrames.filter(e => e.type == 1).length == 1
}
/*
export function distributePhotos(
                                     templates: PageTemplate[],
                                     photos: Photo[],
                                     favoritePhotos: Photo[],
                                     maxPages: number,
                                     favoriteMaxFrames: number = 2
) {


    const count = Math.ceil(photos.length * 0.1); // округляем вверх
    const  delta = count - favoritePhotos.length;
    if(delta > 0) {
        favoritePhotos = [...favoritePhotos, ...photos.slice(0, delta)];
        photos = photos.slice(delta)
    }

    let smallTemplates = templates.filter(t => t.photoFrames.length <= favoriteMaxFrames);
    const largeTemplates = templates.filter(t => t.photoFrames.length > favoriteMaxFrames);


    //const minSmallPages = Math.ceil(maxPages * smallPagePercent);
    const result: { template: PageTemplate; photos: (Photo | null)[] }[] = [];

    const remainingPhotos = [...photos];

    const pickTemplate = (templates: PageTemplate[]) =>
        templates[Math.floor(Math.random() * templates.length)];

    let pageCount = 0;

    // Шаг 1: сначала добавить нужные small-страницы
    while (pageCount < maxPages && result.length < favoritePhotos.length && remainingPhotos.length > 0) {
        const template = pickTemplate(smallTemplates);
        const pagePhotos: (Photo | null)[] = [];

        for (const frame of template.photoFrames) {
            const index = remainingPhotos.findIndex(p => p.orientation === frame.type);
            const photo = index !== -1 ? remainingPhotos.splice(index, 1)[0] : remainingPhotos.shift() || null;
            if (photo) pagePhotos.push( { ...photo, frame: frame});
        }

        if (pagePhotos.length > 0) {
            result.push({template, photos: pagePhotos});
            pageCount++;
        }
    }

    // Шаг 2: добавляем остальные страницы до maxPages
    while (pageCount < maxPages && remainingPhotos.length > 0) {
        const template = pickTemplate(largeTemplates.length ? largeTemplates : smallTemplates);
        const pagePhotos: (Photo | null)[] = [];

        for (const frame of template.photoFrames) {
            const index = remainingPhotos.findIndex(p => p.orientation === frame.type);
            const photo = index !== -1 ? remainingPhotos.splice(index, 1)[0] : remainingPhotos.shift() || null;
            if (photo) pagePhotos.push({ ...photo, frame: frame});
        }

        if (pagePhotos.length > 0) {
            result.push({template, photos: pagePhotos});
            pageCount++;
        }
    }

    return result.map(e => {
        return {
            Photos: e.photos,
            PageTemplateId: e.template.photoTemplateId
        } as Page
    });
}*/

function getRandomItem<T>(items: T[]): T | null {
    if(items.length == 0)
        return null;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
}

function getPageForBorder(prevleft: Page, left:Page, right:Page, prevright:Page, prevprevleft: Page, prevprevright: Page) {
    if (prevleft == null) {
        const index = getRandomItem([1,2])
        if(index == 1)
            left.HasBorders = true;
        if(index == 2)
            right.HasBorders = true;
        //console.log(" selected start : " + index)
        return {left: left, right: right};
    }
    if(prevleft != null && prevright !=null) {
        if((prevleft.HasBorders || prevleft.PageTemplate.hasBorders) && (prevright.HasBorders || prevright.PageTemplate.hasBorders)){
          //  console.log(" selected : null")
            return null;
        }
        if((!prevleft.HasBorders && !prevleft.PageTemplate.hasBorders) && (!prevright.HasBorders && !prevright.PageTemplate.hasBorders)){
            const index = getRandomItem([1,2])
            if(index == 1)
                left.HasBorders = true;
            if(index == 2)
                right.HasBorders = true;
           // console.log(" selected : " + index)
            return {left: left, right: right};
        }
        if((prevleft.HasBorders || prevleft.PageTemplate.hasBorders) && (!prevright.HasBorders && !prevright.PageTemplate.hasBorders)){


            if(prevprevright != null && prevprevleft != null) {
                if((prevprevright.HasBorders || prevprevright.PageTemplate.hasBorders)
                && !prevprevleft.HasBorders && !prevprevleft.PageTemplate.hasBorders) {
                    const index = getRandomItem([1,2])
                    if(index == 1) {
                        //left.HasBorders = true;
                        //right.HasBorders = true;
                        //return {left: left, right: right};
                        return null
                    }
                    if(index == 2) {
                        right.HasBorders = true;
                        return null;
                    }

                }
            }
            right.HasBorders = true;
           // console.log(" selected : right")
            return {left: left, right: right};
        }
        if((!prevleft.HasBorders && !prevleft.PageTemplate.hasBorders) && (prevright.HasBorders || prevright.PageTemplate.hasBorders)){
            if(prevprevright != null && prevprevleft != null) {
                if(!prevprevright.HasBorders && !prevprevright.PageTemplate.hasBorders
                    && (prevprevleft.HasBorders || prevprevleft.PageTemplate.hasBorders)) {
                    const index = getRandomItem([1,2])
                    if(index == 1) {
                       // left.HasBorders = true;
                       // right.HasBorders = true;
                       // return {left: left, right: right};
                        return null
                    }
                    if(index == 2) {
                        right.HasBorders = true;
                        return null;
                    }

                }
            }
            left.HasBorders = true;
           // console.log(" selected : left")
            return {left: left, right: right};
        }
    }
    return  null;
}

export async function addBorders(pages: Array<Page>, activeProject: Album) {


    //console.log(JSON.stringify(activeProject.template.pageTemplates))

    const borderW = activeProject.template.width - activeProject.template.width * 0.85;
    const borderH = activeProject.template.height - activeProject.template.height * 0.85;

    let prevleft = null;
    let prevright = null;
    let prevprevleft = null;
    let prevprevright = null;

    for(var i = 0;  i < pages.length-1; i = i+2) {


        const left = pages[i];
        const right = pages[i + 1];

        if (!left.PageTemplate.hasBorders && !right.PageTemplate.hasBorders && left.PageTemplate.photoFrames.length < 5 && left.PageTemplateId == right.PageTemplateId) {


            let selected = getPageForBorder(prevleft, left, right, prevright, prevprevleft, prevprevright);

            //    getRandomItem([left, right])
            if (selected) {
                let _left = selected.left;
                let _right = selected.right;

                if(_left.HasBorders) {
                    for (var photo of _left.Photos) {
                        photo.frame.width = photo.frame.width * 0.85
                        photo.frame.height = photo.frame.height * 0.85
                        photo.frame.top = photo.frame.top * 0.85
                        photo.frame.left = photo.frame.left * 0.85
                    }

                    for (var photo of _left.Photos) {
                        photo.frame.top = photo.frame.top + Math.ceil(borderH / 2)
                        photo.frame.left = photo.frame.left + Math.ceil(borderW / 2)
                    }
                }
                if(_right.HasBorders) {
                    for (var photo of _right.Photos) {
                        photo.frame.width = photo.frame.width * 0.85
                        photo.frame.height = photo.frame.height * 0.85
                        photo.frame.top = photo.frame.top * 0.85
                        photo.frame.left = photo.frame.left * 0.85
                    }

                    for (var photo of _right.Photos) {
                        photo.frame.top = photo.frame.top + Math.ceil(borderH / 2)
                        photo.frame.left = photo.frame.left + Math.ceil(borderW / 2)
                    }
                }


            }

        }
        prevprevright = prevright
        prevprevleft = prevleft
        prevright = right
        prevleft = left


    }


    //let pagesForBorders = [...pages.filter(e => e.PageTemplate.photoFrames.length < 5 && !e.HasBorders && !e.PageTemplate.hasBorders)];

    /*for (var p1 of pagesForBorders) {
        if(p1.PageTemplate.hasBorders) {

            const pageToAddBorder = pages.find(e => e.id == p1.id);
            if (pageToAddBorder) {
              //  console.log("pageToAddBorder : " + pageToAddBorder.id + " : " + JSON.stringify(pageToAddBorder.PageTemplate))
                pageToAddBorder.HasBorders = true;


                for (var photo of pageToAddBorder.Photos) {
                    photo.frame.width = photo.frame.width * 0.85
                    photo.frame.height = photo.frame.height * 0.85
                    photo.frame.top = photo.frame.top * 0.85
                    photo.frame.left = photo.frame.left * 0.85
                }

                for (var photo of pageToAddBorder.Photos) {
                    photo.frame.top = photo.frame.top + Math.ceil(borderH / 2)
                    photo.frame.left = photo.frame.left + Math.ceil(borderW / 2)
                }
            }
        }
    }*/

    //const recommendedPagesWithBorders = pages.filter(e =>e.PageTemplate.photoFrames.length < 5 && !e.HasBorders  && !e.PageTemplate.hasBorders).length * 0.15;
    //let pagesForBorders = [...pages.filter(e =>e.PageTemplate.photoFrames.length < 5 && !e.HasBorders)];
    //pagesForBorders = pagesForBorders.filter(e => !e.HasBorders);

    /*while (pages.filter(e => e.HasBorders).length < recommendedPagesWithBorders) {

        const nextPage = getRandomItem(pagesForBorders);
        if (!nextPage)
            break;

        const pageToAddBorder = pages.find(e => e.id == nextPage.id);

        if (pageToAddBorder) {
            pageToAddBorder.HasBorders = true;

            for (var p of pageToAddBorder.Photos) {
                p.frame.width =  p.frame.width * 0.85
                p.frame.height =  p.frame.height * 0.85
                p.frame.top =  p.frame.top * 0.85
                p.frame.left =  p.frame.left * 0.85
            }

            for (var p of pageToAddBorder.Photos) {
                p.frame.top =  p.frame.top + Math.ceil(borderH/2)
                p.frame.left =  p.frame.left + Math.ceil(borderW/2)
            }


        }
        pagesForBorders = pagesForBorders.filter(e => e.id != nextPage.id);

    }*/
    return pages;
}

export async function correctTextPosition(photo: Photo, text: Frame){

    if(photo.faces && photo.faces.length > 0) {
        console.log("photo.maxFaceTop " + photo.maxFaceTop + "/" + (text.scaledTop + text.scaledHeight))

        if (photo.maxFaceTop < text.scaledTop + text.scaledHeight) {
            text.scaledTop = 200

        }
    }
}

export async function calculateCoverMockUp(_photo: Photo, real_to_digital_width_scale: number, real_to_digital_height_scale: number) {

    let photo = JSON.parse(JSON.stringify(_photo));

    let current_frame_width = photo.frame.width
    let current_frame_height = photo.frame.height

    const frame_ar = current_frame_width / current_frame_height;

    const photo_ar = photo.width / photo.height;
    let scale;

    if (photo_ar >= frame_ar) {
        // Image is wider → scale by height to cover frame
        scale = current_frame_height / photo.height;
    } else {
        // Image is taller → scale by width to cover frame
        scale = current_frame_width / photo.width;
    }
    photo.resizedPhotoWidth = photo.width * scale;
    photo.resizedPhotoHeight = photo.height * scale;
    const offsetX = (photo.resizedPhotoWidth - current_frame_width) / 2;
    const offsetY = (photo.resizedPhotoHeight - current_frame_height) / 2;
    photo.frame.scaledWidth = current_frame_width / real_to_digital_width_scale
    photo.frame.scaledHeight = current_frame_height / real_to_digital_height_scale

    photo.frame.scaledTop = photo.frame.top / real_to_digital_height_scale;
    photo.frame.scaledLeft = photo.frame.left / real_to_digital_width_scale;

    photo.scaledWidth = photo.resizedPhotoWidth / real_to_digital_width_scale;
    photo.scaledHeight = photo.resizedPhotoHeight / real_to_digital_height_scale;
    photo.offsetX = offsetX / real_to_digital_width_scale;
    photo.offsetY = offsetY / real_to_digital_height_scale;

    photo.frame.cutScaledWidth = photo.frame.cutWidth / real_to_digital_width_scale;
    photo.frame.cutScaledHeight = photo.frame.cutHeight / real_to_digital_height_scale;
    photo.frame.cutScaledTop = photo.frame.cutTop / real_to_digital_height_scale;
    photo.frame.cutScaledLeft = photo.frame.cutLeft / real_to_digital_width_scale;

    photo.frame.secScaledWidth = photo.frame.secWidth / real_to_digital_width_scale;
    photo.frame.secScaledHeight = photo.frame.secHeight / real_to_digital_height_scale;
    photo.frame.secScaledTop = photo.frame.secTop / real_to_digital_height_scale;
    photo.frame.secScaledLeft = photo.frame.secLeft / real_to_digital_width_scale;


    if(photo.faces) {
        let faces = photo.faces.map(f => {
            return {...f}
        });

        for (let j = 0; j < faces.length; j++) {
            let face = faces[j];

            const wScale = photo.width / photo.scaledWidth;
            const hScale = photo.height / photo.scaledHeight;

            face.scaledWidth = face.width / wScale;
            face.scaledHeight = face.height / hScale;

            face.offsetX = (face.left / wScale) - photo.offsetX;
            face.offsetY = (face.top / hScale) - photo.offsetY;
        }
        photo.faces = faces;
        if (photo.faces) {
            photo.maxFaceRight = Math.max(...faces.map(face => face.offsetX + face.scaledWidth));
            photo.maxFaceLeft = Math.min(...faces.map(face => face.offsetX));

            photo.maxFaceTop = Math.min(...faces.map(face => face.offsetY));
            photo.maxFaceBottom = Math.max(...faces.map(face => face.offsetY + face.scaledHeight));

            const left = photo.frame.secScaledLeft ? photo.frame.secScaledLeft: photo.frame.scaledLeft;
            const top = photo.frame.secScaledTop ? photo.frame.secScaledTop : photo.frame.scaledTop;
            const width = photo.frame.secScaledWidth ? photo.frame.secScaledWidth : photo.frame.scaledWidth;
            const height = photo.frame.secScaledHeight ? photo.frame.secScaledHeight : photo.frame.scaledHeight;

            if (photo.maxFaceLeft < left && photo.maxFaceRight < left + width) {

                let deltaLeft = left - photo.maxFaceLeft;
                let deltaRight = (left + width) - photo.maxFaceRight;
                if (deltaRight < deltaLeft) {
                    deltaLeft = deltaRight;
                }
                if (photo.offsetX < deltaLeft) {
                    deltaLeft = photo.offsetX;
                }
                photo.offsetX = photo.offsetX - deltaLeft;
                // if(log)
                //     console.log("s1 : " + photo.index + " " + photo.offsetX + "/" + photo.offsetY)
            }

            if (photo.maxFaceLeft > left && photo.maxFaceRight > left + width) {

                let deltaLeft = photo.maxFaceLeft - left;

                let deltaRight = photo.maxFaceRight - (left + width);

                if (deltaLeft < deltaRight) {
                    deltaRight = deltaLeft;
                }
                if (photo.offsetX < deltaRight) {
                    deltaRight = photo.offsetX;
                }

                photo.offsetX = photo.offsetX + deltaRight;
                //if(log)
                //    console.log("s2 : " + photo.index + " " + photo.offsetX + "/" + photo.offsetY)
            }

            if (photo.maxFaceTop < top && photo.maxFaceBottom < top + height) {

                let deltaTop = top - photo.maxFaceTop;
                let deltaBottom = (top + height) - photo.maxFaceBottom;
                if (deltaBottom < deltaTop) {
                    deltaTop = deltaBottom;
                }
                if (photo.offsetY < deltaTop) {
                    deltaTop = photo.offsetY;
                }
                photo.offsetY = photo.offsetY - deltaTop;
            }

            if (photo.maxFaceTop > top && photo.maxFaceBottom > top + height) {

                let deltaTop = photo.maxFaceTop - top;
                let deltaBottom = photo.maxFaceBottom - (top + height);
                if (deltaTop < deltaBottom) {
                    deltaBottom = deltaTop;
                }
                if (photo.offsetY < deltaBottom) {
                    deltaBottom = photo.offsetY;
                }
                photo.offsetY = photo.offsetY + deltaBottom;
            }





            for (let j = 0; j < photo.faces.length; j++) {
                let face = photo.faces[j];

                const wScale = photo.width / photo.scaledWidth;
                const hScale = photo.height / photo.scaledHeight;

                face.scaledWidth = face.width / wScale;
                face.scaledHeight = face.height / hScale;

                face.offsetX = (face.left / wScale) - photo.offsetX;
                face.offsetY = (face.top / hScale) - photo.offsetY;
            }
            photo.maxFaceRight = Math.max(...faces.map(face => face.offsetX + face.scaledWidth));
            photo.maxFaceLeft = Math.min(...faces.map(face => face.offsetX));


            photo.maxFaceTop = Math.min(...faces.map(face => face.offsetY));
            photo.maxFaceBottom = Math.max(...faces.map(face => face.offsetY + face.scaledHeight));
        }
    }
    return photo;

}

export async function calculatePhoto(photo: Photo,real_to_digital_width_scale: number, real_to_digital_height_scale: number) {
    let current_frame_width = photo.frame.width
    let current_frame_height = photo.frame.height

    const frame_ar = current_frame_width / current_frame_height;
    const photo_ar = photo.width / photo.height;
    let scale;

    if (photo_ar >= frame_ar) {
        // Image is wider → scale by height to cover frame
        scale = current_frame_height / photo.height;
    } else {
        // Image is taller → scale by width to cover frame
        scale = current_frame_width / photo.width;
    }


    photo.resizedPhotoWidth = photo.width * scale;
    photo.resizedPhotoHeight = photo.height * scale;
    const offsetX = (photo.resizedPhotoWidth - current_frame_width) / 2;
    const offsetY = (photo.resizedPhotoHeight - current_frame_height) / 2;

    photo.frame = {...photo.frame};

    photo.frame.scaledWidth = current_frame_width / real_to_digital_width_scale
    photo.frame.scaledHeight = current_frame_height / real_to_digital_height_scale
    photo.frame.scaledTop = photo.frame.top / real_to_digital_height_scale;
    photo.frame.scaledLeft = photo.frame.left / real_to_digital_width_scale;


    const cutArea = Math.ceil(163 / real_to_digital_width_scale)
    const secArea = Math.ceil(94 / real_to_digital_width_scale)

    photo.frame.cutScaledWidth = photo.frame.scaledWidth - cutArea * 2
    photo.frame.cutScaledHeight = photo.frame.scaledHeight - cutArea * 2
    photo.frame.cutScaledTop = photo.frame.scaledTop + cutArea;
    photo.frame.cutScaledLeft = photo.frame.scaledLeft + cutArea;

    photo.frame.secScaledWidth = photo.frame.cutScaledWidth - secArea * 2
    photo.frame.secScaledHeight = photo.frame.cutScaledHeight - secArea * 2
    photo.frame.secScaledTop = photo.frame.cutScaledTop + secArea;
    photo.frame.secScaledLeft = photo.frame.cutScaledLeft + secArea;

    photo.scaledWidth = photo.resizedPhotoWidth / real_to_digital_width_scale;
    photo.scaledHeight = photo.resizedPhotoHeight / real_to_digital_height_scale;
    photo.offsetX = offsetX / real_to_digital_width_scale;
    photo.offsetY = offsetY / real_to_digital_height_scale;

    try {
        if(photo.faces) {
            let faces = photo.faces.map(f => {
                return {...f}
            });

            for (let j = 0; j < faces.length; j++) {
                let face = faces[j];

                const wScale = photo.width / photo.scaledWidth;
                const hScale = photo.height / photo.scaledHeight;

                face.scaledWidth = face.width / wScale;
                face.scaledHeight = face.height / hScale;

                face.offsetX = (face.left / wScale) - photo.offsetX;
                face.offsetY = (face.top / hScale) - photo.offsetY;
            }
            photo.faces = faces;

            photo.maxFaceRight = Math.max(...faces.map(face => face.offsetX + face.scaledWidth));
            photo.maxFaceLeft = Math.min(...faces.map(face => face.offsetX));

            photo.maxFaceTop = Math.min(...faces.map(face => face.offsetY));
            photo.maxFaceBottom = Math.max(...faces.map(face => face.offsetY + face.scaledHeight));

            const secW = 125 / real_to_digital_width_scale
            const secH = 125 / real_to_digital_height_scale

            photo.frame.secScaledLeft = secW;
            photo.frame.secScaledTop = secH;
            photo.frame.secScaledWidth = photo.frame.scaledWidth - (secW * 2);
            photo.frame.secScaledHeight = photo.frame.scaledHeight - (secH * 2);

            const left = photo.frame.secScaledLeft ? photo.frame.secScaledLeft: photo.frame.scaledLeft;
            const top = photo.frame.secScaledTop ? photo.frame.secScaledTop : photo.frame.scaledTop;
            const width = photo.frame.secScaledWidth ? photo.frame.secScaledWidth : photo.frame.scaledWidth;
            const height = photo.frame.secScaledHeight ? photo.frame.secScaledHeight : photo.frame.scaledHeight;

            if (photo.maxFaceLeft < left && photo.maxFaceRight < left + width) {

                let deltaLeft = left - photo.maxFaceLeft;
                let deltaRight = (left + width) - photo.maxFaceRight;
                if (deltaRight < deltaLeft) {
                    deltaLeft = deltaRight;
                }
                if (photo.offsetX < deltaLeft) {
                    deltaLeft = photo.offsetX;
                }
                photo.offsetX = photo.offsetX - deltaLeft;
                // if(log)
                //     console.log("s1 : " + photo.index + " " + photo.offsetX + "/" + photo.offsetY)
            }

            if (photo.maxFaceLeft > left && photo.maxFaceRight > left + width) {

                let deltaLeft = photo.maxFaceLeft - left;

                let deltaRight = photo.maxFaceRight - (left + width);

                if (deltaLeft < deltaRight) {
                    deltaRight = deltaLeft;
                }
                if (photo.offsetX < deltaRight) {
                    deltaRight = photo.offsetX;
                }

                photo.offsetX = photo.offsetX + deltaRight;
                //if(log)
                //    console.log("s2 : " + photo.index + " " + photo.offsetX + "/" + photo.offsetY)
            }

            if (photo.maxFaceTop < top && photo.maxFaceBottom < top + height) {

                let deltaTop = top - photo.maxFaceTop;
                let deltaBottom = (top + height) - photo.maxFaceBottom;
                if (deltaBottom < deltaTop) {
                    deltaTop = deltaBottom;
                }
                if (photo.offsetY < deltaTop) {
                    deltaTop = photo.offsetY;
                }
                photo.offsetY = photo.offsetY - deltaTop;
            }

            if (photo.maxFaceTop > top && photo.maxFaceBottom > top + height) {

                let deltaTop = photo.maxFaceTop - top;
                let deltaBottom = photo.maxFaceBottom - (top + height);
                if (deltaTop < deltaBottom) {
                    deltaBottom = deltaTop;
                }
                if (photo.offsetY < deltaBottom) {
                    deltaBottom = photo.offsetY;
                }
                photo.offsetY = photo.offsetY + deltaBottom;
            }
        }
    } catch (e) {
        console.log("ERROR calculateMockUp : " + e)
    }
    return photo
}

export async function calculateMockUp(pages: Array<Page>, activeProject: Album, real_to_digital_width_scale: number, real_to_digital_height_scale: number, log: boolean = false) {
    console.log("calculateMockUp start: ")
    //let _photos = photos;
    // let pages = distributePhotos(templates, photos.filter(e => !e.isFavorite), photos.filter(e => e.isFavorite), activeProject.template.maxSpreadsCount,  2)



    for (let p = 0; p < pages.length; p++) {

        const page = pages[p] as Page;
        if(!page.Photos || page.Photos.length == 0)
            continue;

       // console.log("page  " + page.HasBorders)
        for (let i = 0; i < page.Photos.length; i++) {

            const photo = page.Photos[i]
            const filePath = photo.imageUrl;


            if(!photo.frame)
                continue;

            await calculatePhoto(photo,real_to_digital_width_scale, real_to_digital_height_scale)


        }
    }
    console.log("calculateMockUp end: ")
    return pages;
}
